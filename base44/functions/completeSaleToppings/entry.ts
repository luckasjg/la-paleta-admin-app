import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { deductItemToppings } from '../../shared/toppingDeduction.ts';

// Completa en Despacho los cupos de toppings incluidos pendientes de un ítem
// y descuenta del inventario todos sus toppings aún no descontados.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sale_id, item_index, choices } = await req.json().catch(() => ({}));
    if (!sale_id || !Number.isInteger(item_index) || !Array.isArray(choices)) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const sale = await db.Sale.get(sale_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status !== 'completed') return Response.json({ error: 'La venta fue anulada' }, { status: 400 });

    const items = [...(sale.items || [])];
    const item = items[item_index];
    if (!item?.pending_toppings) return Response.json({ error: 'Los toppings de este ítem ya fueron completados' }, { status: 400 });

    const inc = item.included_toppings_count || 0;
    const units = Array.from({ length: item.quantity || 1 }, (_, i) => (item.unit_toppings?.[i] || []).map((t) => ({ ...t })));
    if (choices.length !== units.length) return Response.json({ error: 'Cantidad de unidades inválida' }, { status: 400 });

    const ids = [...new Set(choices.flat().filter((c) => c && c !== 'none'))];
    let toppings = [];
    if (ids.length) {
      const res = await db.Product.filter({ id: { $in: ids } });
      toppings = Array.isArray(res) ? res : res.items;
    }
    const allowed = item.allowed_topping_ids || [];
    for (const id of ids) {
      const t = toppings.find((x) => x.id === id);
      const ok = t && (allowed.length ? allowed.includes(id) : (t.category || '').toLowerCase() === 'adicional');
      if (!ok) return Response.json({ error: 'Topping no permitido para este producto' }, { status: 400 });
    }

    for (let u = 0; u < units.length; u++) {
      const pending = Math.max(0, inc - units[u].filter((t) => t.included).length);
      const picks = Array.isArray(choices[u]) ? choices[u] : [];
      if (picks.length !== pending || picks.some((c) => !c)) {
        return Response.json({ error: `Faltan toppings en la unidad ${u + 1}` }, { status: 400 });
      }
      // Los incluidos van primero para conservar el orden de cupos.
      const fills = picks.map((c) => {
        if (c === 'none') return { none: true, product_name: 'Sin topping', list_price: 0, price: 0, included: true };
        const t = toppings.find((x) => x.id === c);
        return { product_id: t.id, product_name: t.name, list_price: t.price || 0, price: 0, included: true };
      });
      const inc0 = units[u].filter((t) => t.included);
      const extras = units[u].filter((t) => !t.included);
      units[u] = [...inc0, ...fills, ...extras];
    }

    // Marcar la venta antes de mover inventario evita doble descuento si se reintenta.
    const done = { ...item, unit_toppings: units, pending_toppings: false, pending_included_toppings: 0 };
    items[item_index] = done;
    const stillPending = items.some((i) => i.pending_dispatch === true || i.pending_toppings === true);
    await db.Sale.update(sale.id, {
      items,
      dispatch_status: stillPending ? 'pendiente' : 'despachado',
      ...(stillPending ? {} : { dispatched_at: new Date().toISOString() }),
    });

    const deducted = await deductItemToppings(db, done);
    items[item_index] = deducted;
    await db.Sale.update(sale.id, { items });

    return Response.json({ ok: true, dispatch_status: stillPending ? 'pendiente' : 'despachado', toppings_cost: deducted.toppings_cost });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}