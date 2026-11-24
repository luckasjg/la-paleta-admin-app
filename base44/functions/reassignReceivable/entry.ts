import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MASTER_ADMINS = ['luckasjimenez@gmail.com'];

// Cambia el cliente de una cuenta por cobrar, su venta y sus abonos.
// No toca inventario (Supply, Tray, InventoryAdjustment) ni fechas.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = ['admin', 'gerente'].includes(user.role) || MASTER_ADMINS.includes((user.email || '').toLowerCase());
    if (!allowed) return Response.json({ error: 'Solo administradores y gerentes pueden reasignar' }, { status: 403 });

    const { receivable_id, customer_id, reason } = await req.json().catch(() => ({}));
    if (!receivable_id || !customer_id) return Response.json({ error: 'receivable_id y customer_id son requeridos' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const notFound = (e) => (e.status === 404 ? null : Promise.reject(e));
    const [rec, cust] = await Promise.all([
      db.AccountReceivable.get(receivable_id).catch(notFound),
      db.Customer.get(customer_id).catch(notFound),
    ]);
    if (!rec) return Response.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 });
    if (!cust) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    if (rec.customer_id === cust.id) return Response.json({ error: 'La cuenta ya pertenece a ese cliente' }, { status: 400 });

    const prev = rec.customer_id ? await db.Customer.get(rec.customer_id).catch(notFound) : null;
    const fromCedula = rec.customer_cedula || prev?.cedula || '';

    const entry = {
      from_customer_id: rec.customer_id || '',
      from_customer_name: rec.customer_name || prev?.full_name || '',
      from_customer_cedula: fromCedula,
      to_customer_id: cust.id,
      to_customer_name: cust.full_name,
      to_customer_cedula: cust.cedula || '',
      reason: String(reason || '').slice(0, 300),
      reassigned_at: new Date().toISOString(),
      reassigned_by: user.full_name || user.email,
    };

    await db.AccountReceivable.update(rec.id, {
      customer_id: cust.id,
      customer_name: cust.full_name,
      customer_phone: cust.phone || '',
      customer_cedula: cust.cedula || '',
      reassignment_history: [...(rec.reassignment_history || []), entry],
    });

    if (rec.sale_id) {
      const sale = await db.Sale.get(rec.sale_id).catch(notFound);
      if (sale) {
        await db.Sale.update(sale.id, {
          customer_id: cust.id,
          customer_name: cust.full_name,
          customer_cedula: cust.cedula || '',
        });
      }
    }

    // Abonos del cliente anterior aplicados a esta deuda.
    let moved = 0;
    let shared = 0;
    if (rec.customer_id) {
      const pays = await db.ReceivablePayment.filter({ customer_id: rec.customer_id }, '-payment_date', 500);
      const list = Array.isArray(pays) ? pays : (pays?.items || []);
      const linked = list.filter((p) => (p.allocations || []).some((a) => a.receivable_id === rec.id));
      const exclusive = linked.filter((p) => (p.allocations || []).every((a) => a.receivable_id === rec.id));
      shared = linked.length - exclusive.length;
      if (exclusive.length) {
        await db.ReceivablePayment.bulkUpdate(exclusive.map((p) => ({ id: p.id, customer_id: cust.id, customer_name: cust.full_name })));
        moved = exclusive.length;
      }
    }

    return Response.json({ ok: true, moved_payments: moved, shared_payments: shared });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}