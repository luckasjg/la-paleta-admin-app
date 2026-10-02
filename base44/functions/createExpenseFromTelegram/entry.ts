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
    const amount = Number(body.amount);
    const date = String(body.date || '');
    const notes = String(body.notes || '').slice(0, 500);

    if (!description) return Response.json({ error: 'Falta la descripción' }, { status: 400 });
    if (!reportedBy) return Response.json({ error: 'Falta el nombre de quien reporta (reported_by)' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      return Response.json({ error: 'Monto inválido: debe ser USD ya convertido, mayor a 0 y menor a 10000' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: 'Fecha inválida (YYYY-MM-DD)' }, { status: 400 });

    const { items: cats } = await base44.asServiceRole.entities.Expense.list({ distinct: 'category' });
    if (!cats.includes(category)) {
      return Response.json({ error: 'Categoría no existe', valid_categories: cats }, { status: 400 });
    }

    const expense = await base44.asServiceRole.entities.Expense.create({
      description,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
      type: 'variable',
      is_recurring: false,
      recurring_active: false,
      reported_by: reportedBy,
      notes: `${notes} | Reportado por Telegram: ${reportedBy}`.replace(/^ \| /, ''),
    });

    return Response.json({ ok: true, id: expense.id, amount: expense.amount, category, date });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}