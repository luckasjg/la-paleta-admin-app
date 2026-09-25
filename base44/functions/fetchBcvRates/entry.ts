import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Fuente principal: la página oficial del BCV (se actualiza apenas publica,
// incluso si la "Fecha Valor" es del siguiente día hábil).
// Respaldo: ve.dolarapi.com, que replica la publicación con retraso.
const BCV_URL = 'https://www.bcv.org.ve/';
const FALLBACK_URL = 'https://ve.dolarapi.com/v1/euros/oficial';

async function readFromBcv() {
  const res = await fetch(BCV_URL, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' } });
  if (!res.ok) throw new Error(`BCV respondió ${res.status}`);
  const html = await res.text();
  const block = html.match(/id="euro"[\s\S]*?<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/i);
  if (!block) throw new Error('No se encontró la tasa EUR en la página del BCV');
  const value = Number(block[1].replace(/\./g, '').replace(',', '.'));
  if (!(value > 0)) throw new Error('La página del BCV no devolvió una tasa válida');
  const date = html.match(/date-display-single[^>]*content="([^"]+)"/i);
  return { value, updatedAt: date ? date[1] : null, source: 'bcv.org.ve' };
}

async function readFromFallback() {
  const res = await fetch(FALLBACK_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Fuente de respaldo respondió ${res.status}`);
  const json = await res.json();
  const value = Number(json?.promedio ?? json?.venta ?? json?.compra);
  if (!(value > 0)) throw new Error('La fuente de respaldo no devolvió una tasa válida');
  return { value, updatedAt: json?.fechaActualizacion || null, source: 'dolarapi' };
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
    let bcvError = null;
    try {
      eur = await readFromBcv();
    } catch (e) {
      bcvError = e.message;
      console.error('BCV directo falló:', e.message);
      try {
        eur = await readFromFallback();
      } catch (fetchError) {
        // Ambas fuentes fallaron: se conserva la tasa anterior.
        await upsert('last_bcv_fetch_error', `${new Date().toISOString()} — ${bcvError} / ${fetchError.message}`);
        return Response.json({
          ok: false,
          kept_previous: true,
          error: `${bcvError} / ${fetchError.message}`,
          eur_ves: byKey.exchange_rate_eur_ves?.value || null,
        });
      }
    }

    await upsert('exchange_rate_eur_ves', eur.value);
    await upsert('last_bcv_fetch_at', new Date().toISOString());
    await upsert('last_bcv_publish_date', eur.updatedAt || '');
    await upsert('last_bcv_fetch_error', '');

    return Response.json({
      ok: true,
      eur_ves: eur.value,
      published_at: eur.updatedAt,
      source: eur.source,
      bcv_error: bcvError,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}