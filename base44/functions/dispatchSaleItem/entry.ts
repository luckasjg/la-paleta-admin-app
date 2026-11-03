import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Despacha un ítem pendiente de una venta por unidades: cada unidad trae sus
// bandejas; la línea se divide en ítems de cantidad 1 y cada bandeja se
// descuenta una sola vez con los gramos acumulados (se permite negativo).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sale_id, item_index } = body;
    const units = Array.isArray(body.units) ? body.units : (Array.isArray(body.tray_ids) ? null : undefined);
    if (!sale_id || !Number.isInteger(item_index) || units === undefined) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const sale = await db.Sale.get(sale_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status !== 'completed') return Response.json({ error: 'La venta fue anulada' }, { status: 400 });

    const items = [...(sale.items || [])];
    const item = items[item_index];
    if (!item || !item.pending_dispatch) return Response.json({ error: 'Este ítem ya fue despachado' }, { status: 400 });

    const qty = item.quantity || 1;
    // Compatibilidad: tray_ids (misma selección para todas las unidades)
    const unitList = units || Array.from({ length: qty }, () => body.tray_ids);
    if (unitList.length !== qty || unitList.some((u) => !Array.isArray(u) || u.length === 0 || u.length > 5)) {
      return Response.json({ error: 'Cada unidad necesita entre 1 y 5 sabores' }, { status: 400 });
    }

    const allIds = [...new Set(unitList.flat())];
    const trays = await db.Tray.filter({ id: { $in: allIds } });
    const list = Array.isArray(trays) ? trays : trays.items;
    if (list.length !== allIds.length) return Response.json({ error: 'Bandeja no encontrada' }, { status: 400 });

    const gramsPerUnit = item.grams || 80;
    const demand = {};
    const newItems = unitList.map((ids) => {
      const g = +(gramsPerUnit / ids.length).toFixed(2);
      const ordered = ids.map((id) => list.find((t) => t.id === id));
      ordered.forEach((t) => { demand[t.id] = (demand[t.id] || 0) + g; });
      return {
        ...item,
        quantity: 1,
        subtotal: +((item.subtotal || 0) / qty).toFixed(2),
        ...(item.subtotal_eur != null ? { subtotal_eur: +(item.subtotal_eur / qty).toFixed(2) } : {}),
        ...(item.bonus_free_qty ? { bonus_free_qty: +(item.bonus_free_qty / qty).toFixed(4) } : {}),
        pending_dispatch: false,
        flavors: ordered.map((t) => ({ tray_id: t.id, recipe_name: t.recipe_name, grams: g })),
        tray_id: ordered[0].id,
        flavor: ordered.map((t) => t.recipe_name).join(' + '),
      };
    });

    // Marcar la venta primero evita doble descuento si se reintenta.
    items.splice(item_index, 1, ...newItems);
    const stillPending = items.some((i) => i.pending_dispatch === true);
    await db.Sale.update(sale.id, { items, dispatch_status: stillPending ? 'pendiente' : 'despachado' });

    await Promise.all(list.map((tray) => {
      const newRemaining = (tray.remaining_grams || 0) - demand[tray.id];
      return db.Tray.update(tray.id, {
        remaining_grams: newRemaining,
        status: newRemaining <= 0 ? 'agotada' : 'activa',
        ...(newRemaining <= 0 ? { in_vitrine: false, closed_at: new Date().toISOString() } : {}),
      });
    }));

    return Response.json({ ok: true, dispatch_status: stillPending ? 'pendiente' : 'despachado' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}