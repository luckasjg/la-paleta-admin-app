import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Despacha un ítem pendiente de una venta: descuenta los gramos de las bandejas
// elegidas por el heladero y marca el ítem como servido.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sale_id, item_index, tray_ids } = await req.json().catch(() => ({}));
    if (!sale_id || !Number.isInteger(item_index) || !Array.isArray(tray_ids) || tray_ids.length === 0 || tray_ids.length > 5) {
      return Response.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const sale = await db.Sale.get(sale_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status !== 'completed') return Response.json({ error: 'La venta fue anulada' }, { status: 400 });

    const items = [...(sale.items || [])];
    const item = items[item_index];
    if (!item || !item.pending_dispatch) return Response.json({ error: 'Este ítem ya fue despachado' }, { status: 400 });

    const trays = await db.Tray.filter({ id: { $in: tray_ids } });
    const list = Array.isArray(trays) ? trays : trays.items;
    if (list.length !== tray_ids.length) return Response.json({ error: 'Bandeja no encontrada' }, { status: 400 });

    const gramsPerUnit = item.grams || 80;
    const gramsPerFlavor = +(gramsPerUnit / tray_ids.length).toFixed(2);
    const qty = item.quantity || 1;

    // Igual que la caja: se permite negativo para que la auditoría concilie la merma.
    await Promise.all(list.map((tray) => {
      const newRemaining = (tray.remaining_grams || 0) - gramsPerFlavor * qty;
      return db.Tray.update(tray.id, {
        remaining_grams: newRemaining,
        status: newRemaining <= 0 ? 'agotada' : 'activa',
        ...(newRemaining <= 0 ? { in_vitrine: false, closed_at: new Date().toISOString() } : {}),
      });
    }));

    const ordered = tray_ids.map((id) => list.find((t) => t.id === id));
    items[item_index] = {
      ...item,
      pending_dispatch: false,
      flavors: ordered.map((t) => ({ tray_id: t.id, recipe_name: t.recipe_name, grams: gramsPerFlavor })),
      tray_id: ordered[0].id,
      flavor: ordered.map((t) => t.recipe_name).join(' + '),
    };
    const stillPending = items.some((i) => i.pending_dispatch === true);

    await db.Sale.update(sale.id, { items, dispatch_status: stillPending ? 'pendiente' : 'despachado' });
    return Response.json({ ok: true, dispatch_status: stillPending ? 'pendiente' : 'despachado' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}