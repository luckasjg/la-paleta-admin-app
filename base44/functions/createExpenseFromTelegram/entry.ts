import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Invocada por el agente «gastos» (Telegram, acceso anónimo). Crea un gasto
// variable no recurrente con rol de servicio, validando estrictamente la entrada.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const description = String(body.description || '').trim().slice(0, 200);
    const category = String(body.category || '').trim();
    const reportedBy = String(body.reported_by || '').trim().slice(0, 80);
    const amountNative = Number(body.amount_native);
    const currency = String(body.currency || '').trim().toUpperCase() === 'USD' ? 'USD'
      : ['BS', 'VES'].includes(String(body.currency || '').trim().toUpperCase()) ? 'Bs' : null;
    const date = String(body.date || '');
    const notesIn = String(body.notes || '').slice(0, 400);

    if (!description) return Response.json({ error: 'Falta la descripción' }, { status: 400 });
    if (!reportedBy) return Response.json({ error: 'Falta el nombre de quien reporta (reported_by)' }, { status: 400 });
    if (!currency) return Response.json({ error: "Moneda inválida: usa 'Bs' o 'USD'" }, { status: 400 });
    if (!Number.isFinite(amountNative) || amountNative <= 0) {
      return Response.json({ error: 'Monto inválido: debe ser mayor a 0' }, { status: 400 });
    }

    let rate = null;
    let amount = amountNative;
    if (currency === 'Bs') {
      const settings = await base44.asServiceRole.entities.ShopSetting.filter({
        key: { $in: ['use_manual_rate', 'manual_rate_eur_ves', 'exchange_rate_eur_ves'] },
      });
      const get = (k) => settings.find((s) => s.key === k)?.value;
      rate = Number(get('use_manual_rate') === 'true' ? get('manual_rate_eur_ves') : get('exchange_rate_eur_ves'));
      if (!Number.isFinite(rate) || rate <= 0) {
        return Response.json({ error: 'No hay tasa de cambio configurada' }, { status: 500 });
      }
      amount = amountNative / rate;
    }
    amount = Math.round(amount * 100) / 100;
    if (amount <= 0 || amount > 10000) {
      return Response.json({ error: `Monto convertido fuera de rango (${amount} USD): debe ser mayor a 0 y hasta 10000 USD` }, { status: 400 });
    }
    const trail = currency === 'Bs'
      ? `Original: ${amountNative} Bs | Tasa EUR↔VES: ${rate} | USD: ${amount}`
      : `Original: ${amountNative} USD`;
    const notes = [notesIn, trail].filter(Boolean).join(' | ');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: 'Fecha inválida (YYYY-MM-DD)' }, { status: 400 });

    const { items: cats } = await base44.asServiceRole.entities.Expense.list({ distinct: 'category' });
    if (!cats.includes(category)) {
      return Response.json({ error: 'Categoría no existe', valid_categories: cats }, { status: 400 });
    }

    const expense = await base44.asServiceRole.entities.Expense.create({
      description,
      amount,
      category,
      date,
      type: 'variable',
      is_recurring: false,
      recurring_active: false,
      reported_by: reportedBy,
      notes: `${notes} | Reportado por Telegram: ${reportedBy}`.replace(/^ \| /, ''),
    });

    return Response.json({ ok: true, id: expense.id, amount_usd: amount, original_native: amountNative, currency, rate, category, date });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}