import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Tasas oficiales del BCV (USD/VES y EUR/VES) publicadas por ve.dolarapi.com,
// que replica la publicación diaria del Banco Central de Venezuela.
const SOURCES = {
  usd: 'https://ve.dolarapi.com/v1/dolares/oficial',
  eur: 'https://ve.dolarapi.com/v1/euros/oficial',
};

async function readRate(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Fuente BCV respondió ${res.status}`);
  const json = await res.json();
  const value = Number(json?.promedio ?? json?.venta ?? json?.compra);
  if (!(value > 0)) throw new Error('La fuente BCV no devolvió una tasa válida');
  return { value, updatedAt: json?.fechaActualizacion || null };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const settings = base44.asServiceRole.entities.ShopSetting;

    const existing = await settings.list();
    const byKey = {};
    for (const row of existing || []) byKey[row.key] = row;

    const upsert = async (key, value) => {
      const clean = String(value);
      const row = byKey[key];
      if (row) await settings.update(row.id, { value: clean });
      else await settings.create({ key, value: clean });
    };

    let usd;
    let eur;
    try {
      usd = await readRate(SOURCES.usd);
      eur = await readRate(SOURCES.eur);
    } catch (fetchError) {
      // El BCV aún no publicó o la fuente falló: se conservan las tasas anteriores.
      await upsert('last_bcv_fetch_error', `${new Date().toISOString()} — ${fetchError.message}`);
      return Response.json({
        ok: false,
        kept_previous: true,
        error: fetchError.message,
        usd_ves: byKey.exchange_rate_usd_ves?.value || null,
        eur_ves: byKey.exchange_rate_eur_ves?.value || null,
      });
    }

    // Cross derivada: cuántos EUR equivale 1 USD (precio base USD → cobro en EUR).
    const eurPerUsd = +(usd.value / eur.value).toFixed(6);

    await upsert('exchange_rate_usd_ves', usd.value);
    await upsert('exchange_rate_eur_ves', eur.value);
    await upsert('exchange_rate_usd_eur', eurPerUsd);
    await upsert('last_bcv_fetch_at', new Date().toISOString());
    await upsert('last_bcv_publish_date', usd.updatedAt || '');
    await upsert('last_bcv_fetch_error', '');
    if (!byKey.base_currency) await upsert('base_currency', 'USD');

    return Response.json({
      ok: true,
      usd_ves: usd.value,
      eur_ves: eur.value,
      usd_eur: eurPerUsd,
      published_at: usd.updatedAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}