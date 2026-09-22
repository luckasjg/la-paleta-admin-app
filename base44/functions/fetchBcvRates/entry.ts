import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Tasa oficial del euro BCV publicada por ve.dolarapi.com, que replica la
// publicación diaria del Banco Central de Venezuela. Es la única tasa que usa
// el sistema: el precio base en USD se cobra en EUR a paridad 1:1 y los
// bolívares se calculan con esta tasa EUR↔VES.
const EUR_SOURCE = 'https://ve.dolarapi.com/v1/euros/oficial';

async function readRate(url: string) {
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
    const byKey: Record<string, any> = {};
    for (const row of existing || []) byKey[row.key] = row;

    const upsert = async (key: string, value: unknown) => {
      const clean = String(value);
      const row = byKey[key];
      if (row) await settings.update(row.id, { value: clean });
      else await settings.create({ key, value: clean });
    };

    let eur;
    try {
      eur = await readRate(EUR_SOURCE);
    } catch (fetchError) {
      // El BCV aún no publicó o la fuente falló: se conserva la tasa anterior.
      await upsert('last_bcv_fetch_error', `${new Date().toISOString()} — ${fetchError.message}`);
      return Response.json({
        ok: false,
        kept_previous: true,
        error: fetchError.message,
        eur_ves: byKey.exchange_rate_eur_ves?.value || null,
      });
    }

    await upsert('exchange_rate_eur_ves', eur.value);
    await upsert('last_bcv_fetch_at', new Date().toISOString());
    await upsert('last_bcv_publish_date', eur.updatedAt || '');
    await upsert('last_bcv_fetch_error', '');

    return Response.json({
      ok: true,
      eur_ves: eur.value,
      published_at: eur.updatedAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}