import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const SHEET_ID = '1mJ_uNsu0xx93jrq6MhIGxS_sUBt_oUMMoEgVgS9kNr8';
const TAB_RE = /^(\d{1,2})\/(\d{1,2})\s+al\s+(\d{1,2})\/(\d{1,2})$/i;
const USD_ACCOUNTS = /(\$|usd|usdt|binance|zelle)/i;

const parseNum = (v) => {
  const s = String(v ?? '').replace(/[$\s]/g, '');
  if (!s || /#/.test(s)) return NaN;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return n;
};
const pad = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const keyOf = (date, amount, desc) => `${date}|${Number(amount).toFixed(2)}|${norm(desc)}`;

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const db = base44.asServiceRole.entities;
  const source = body.source === 'manual' ? 'manual' : 'automatico';

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const gs = async (path) => {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(20000),
      });
      const j = await r.json();
      if (j.error) throw new Error(`Google Sheets: ${j.error.message}`);
      return j;
    };

    const meta = await gs('?fields=sheets.properties.title');
    const weekly = meta.sheets.map((s) => s.properties.title).filter((t) => TAB_RE.test(t.trim()));
    const tabs = body.all_tabs ? weekly : weekly.slice(-3);

    // Tasa actual de la app (respaldo cuando la fila en Bs no trae tasa ni $)
    const settings = await db.ShopSetting.filter({ key: { $in: ['use_manual_rate', 'manual_rate_eur_ves', 'exchange_rate_eur_ves'] } });
    const getS = (k) => settings.find((s) => s.key === k)?.value;
    const appRate = Number(getS('use_manual_rate') === 'true' ? getS('manual_rate_eur_ves') : getS('exchange_rate_eur_ves'));

    const today = new Date();
    const year = today.getFullYear();
    const candidates = [];
    const review = [];
    let rowsRead = 0;

    for (const tab of tabs) {
      const [, sd, sm, , em] = tab.trim().match(TAB_RE).map(Number);
      const data = await gs(`/values/${encodeURIComponent(`'${tab}'!A1:Q600`)}`);
      const rows = data.values || [];
      const hIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'concepto') && r.some((c) => norm(c) === 'fecha'));
      if (hIdx < 0) { review.push({ tab, row: 0, text: '', reason: 'No se encontró el libro de egresos' }); continue; }
      const h = rows[hIdx].map(norm);
      const col = (name) => h.findIndex((c) => c.startsWith(name));
      const c = { fecha: col('fecha'), cuenta: col('cuenta'), concepto: col('concepto'), detalle: col('detalle'), monto: col('monto'), desc: col('descrip'), resp: col('respons'), tasa: col('tasa'), usd: h.lastIndexOf('$') };
      let lastDate = `${year}-${pad(sm)}-${pad(sd)}`;

      for (let i = hIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.some((x) => /ingreso/i.test(String(x))) && r.some((x) => norm(x) === 'concepto')) break; // fin del libro de egresos
        const concepto = String(r[c.concepto] || '').trim();
        const montoRaw = r[c.monto];
        if (!concepto && !String(montoRaw || '').trim()) continue;
        rowsRead++;
        const text = r.filter(Boolean).join(' | ').slice(0, 250);

        // Fecha: "13/10", "13" o vacía (hereda la anterior)
        const f = String(r[c.fecha] || '').trim();
        const m = f.match(/^(\d{1,2})(?:\/(\d{1,2}))?/);
        if (m) {
          const d = Number(m[1]);
          const mo = m[2] ? Number(m[2]) : (d >= sd ? sm : em);
          let y = year;
          if (new Date(y, mo - 1, d) > new Date(today.getTime() + 31 * 864e5)) y -= 1;
          lastDate = `${y}-${pad(mo)}-${pad(d)}`;
        }
        const monto = parseNum(montoRaw);
        if (!concepto || !Number.isFinite(monto) || monto <= 0) {
          review.push({ tab, row: i + 1, text, reason: 'Falta concepto o monto válido' });
          continue;
        }
        const cuenta = String(r[c.cuenta] || '').trim();
        const isUsd = USD_ACCOUNTS.test(cuenta) || String(r[c.detalle] || '').trim() === '$';
        const usdCol = parseNum(r[c.usd]);
        const tasa = parseNum(r[c.tasa]);
        let amount; let trail;
        if (isUsd) { amount = monto; trail = `Original: ${monto} USD`; }
        else if (Number.isFinite(usdCol) && usdCol > 0) { amount = usdCol; trail = `Original: ${monto} Bs | USD según hoja`; }
        else if (Number.isFinite(tasa) && tasa > 0) { amount = monto / tasa; trail = `Original: ${monto} Bs | Tasa hoja: ${tasa}`; }
        else if (appRate > 0) { amount = monto / appRate; trail = `Original: ${monto} Bs | Tasa app: ${appRate}`; }
        else { review.push({ tab, row: i + 1, text, reason: 'Sin tasa para convertir Bs' }); continue; }
        amount = Math.round(amount * 100) / 100;
        const extra = [r[c.detalle], r[c.desc]].map((x) => String(x || '').trim()).filter((x) => x && x !== '$').join(' · ');
        candidates.push({
          tab, row: i + 1, text, date: lastDate, amount, description: concepto.slice(0, 200), cuenta,
          responsable: String(r[c.resp] || '').trim(),
          notes: [`Cuenta: ${cuenta || '—'}`, extra, trail, `Hoja: ${tab} fila ${i + 1}`].filter(Boolean).join(' | '),
        });
      }
    }

    // Deduplicación por fecha + monto + descripción
    const dates = [...new Set(candidates.map((x) => x.date))];
    const existing = dates.length ? await db.Expense.filter({ date: { $in: dates } }, '-date', 5000) : [];
    const seen = new Set(existing.map((e) => keyOf(e.date, e.amount, e.description)));
    const fresh = [];
    let duplicates = 0;
    for (const x of candidates) {
      const k = keyOf(x.date, x.amount, x.description);
      if (seen.has(k)) { duplicates++; continue; }
      seen.add(k); fresh.push(x);
    }

    // El agente IA clasifica categoría/tipo y descarta lo que no es gasto
    let created = 0;
    if (fresh.length) {
      const { items: cats } = await db.Expense.list({ distinct: 'category' });
      const out = [];
      for (let i = 0; i < fresh.length; i += 60) {
        const chunk = fresh.slice(i, i + 60);
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Eres el asistente contable de una heladería en Venezuela. Clasifica cada egreso del libro de gastos.
Categorías válidas (usa EXACTAMENTE una): ${cats.join(', ')}.
type: "fijo" para nómina, quincenas, alquiler, servicios, impuestos recurrentes; "variable" para compras, gasolina, reparaciones, etc.
is_expense=false SOLO si claramente no es un gasto real (vuelto entregado a cliente, transferencia entre cuentas propias, cambio de divisas); explica en reason.
Egresos:
${chunk.map((x, j) => `${j}. ${x.description} | ${x.notes}`).join('\n')}`,
          response_json_schema: {
            type: 'object',
            properties: { items: { type: 'array', items: { type: 'object', properties: {
              index: { type: 'number' }, category: { type: 'string' }, type: { type: 'string' }, is_expense: { type: 'boolean' }, reason: { type: 'string' },
            } } } },
          },
        });
        for (const it of res.items || []) {
          const x = chunk[it.index];
          if (!x) continue;
          if (it.is_expense === false) { review.push({ tab: x.tab, row: x.row, text: x.text, reason: `No parece gasto: ${it.reason || ''}` }); continue; }
          if (!cats.includes(it.category)) { review.push({ tab: x.tab, row: x.row, text: x.text, reason: 'No se pudo asignar categoría' }); continue; }
          out.push({
            description: x.description, amount: x.amount, category: it.category,
            type: it.type === 'fijo' ? 'fijo' : 'variable', date: x.date,
            is_recurring: false, recurring_active: false,
            reported_by: x.responsable || 'Hoja de Google', notes: x.notes,
          });
        }
      }
      for (let i = 0; i < out.length; i += 200) await db.Expense.bulkCreate(out.slice(i, i + 200));
      created = out.length;
    }

    const run = {
      run_at: new Date().toISOString(), source, tabs, rows_read: rowsRead, created_count: created,
      duplicate_count: duplicates, review_count: review.length, review_rows: review.slice(0, 200), status: 'ok',
    };
    await db.ExpenseSyncRun.create(run);
    return Response.json(run);
  } catch (error) {
    await db.ExpenseSyncRun.create({ run_at: new Date().toISOString(), source, status: 'error', error: error.message }).catch(() => {});
    return Response.json({ error: error.message }, { status: 500 });
  }
}