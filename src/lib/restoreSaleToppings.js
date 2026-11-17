import { base44 } from '@/api/base44Client';
import { buildStockDelta, getStockAt } from '@/lib/stockHelpers';

/** true si la venta pasó por Despacho y este la completó. */
export const wasDispatched = (sale) =>
  sale?.dispatch_status === 'despachado' &&
  (!!sale.dispatched_at || (sale.items || []).some(i => i.pending_dispatch === false));

/**
 * Reintegra al inventario los insumos de los toppings (incluidos y extras)
 * que efectivamente se descontaron. Los cupos pendientes no se tocan.
 * Cada insumo queda registrado en InventoryAdjustment (sale_cancellation).
 */
export async function restoreSaleToppings(sale) {
  const toppings = (sale.items || []).flatMap(i => (i.unit_toppings || []).flat())
    .filter(t => t && t.deducted && !t.none);
  if (!toppings.length) return;

  // Evita reintegrar dos veces si la anulación se reintenta.
  const prev = await base44.entities.InventoryAdjustment.filter({ type: 'sale_cancellation', reference_id: sale.id });
  if ((Array.isArray(prev) ? prev : prev.items).length) return;

  // Ventas antiguas sin detalle guardado: se usan los insumos actuales del producto.
  const legacyIds = [...new Set(toppings.filter(t => !t.deducted_supplies && t.product_id).map(t => t.product_id))];
  const prodRes = legacyIds.length ? await base44.entities.Product.filter({ id: { $in: legacyIds } }) : [];
  const products = Array.isArray(prodRes) ? prodRes : prodRes.items;

  const demand = {}; // `${supply_id}|${location}` -> { qty, names }
  for (const t of toppings) {
    const lines = t.deducted_supplies
      || (products.find(p => p.id === t.product_id)?.linked_supplies || []);
    const loc = t.deducted_location || 'production';
    for (const l of lines) {
      if (!l.supply_id || !(l.quantity > 0)) continue;
      const k = `${l.supply_id}|${loc}`;
      demand[k] = demand[k] || { supply_id: l.supply_id, location: loc, qty: 0, names: new Set() };
      demand[k].qty += l.quantity;
      demand[k].names.add(t.product_name);
    }
  }
  const entries = Object.values(demand);
  if (!entries.length) return;

  // Lectura fresca: los pasos previos de la anulación pudieron mover estos insumos.
  const supRes = await base44.entities.Supply.filter({ id: { $in: [...new Set(entries.map(e => e.supply_id))] } });
  const supplies = Array.isArray(supRes) ? supRes : supRes.items;
  const logs = [];
  for (const e of entries) {
    const s = supplies.find(x => x.id === e.supply_id);
    if (!s || s.is_infinite) continue;
    const before = getStockAt(s, e.location);
    const delta = buildStockDelta(s, e.location, e.qty);
    await base44.entities.Supply.update(s.id, delta);
    Object.assign(s, delta);
    logs.push({
      type: 'sale_cancellation',
      reason: 'anulacion_venta',
      reference_id: sale.id,
      reference_name: `Venta #${sale.ticket_number ?? sale.id.slice(-6)}`,
      reference_label: 'Anulación de venta',
      supply_id: s.id,
      supply_name: s.name,
      unit: s.unit,
      category: s.category,
      location: e.location,
      quantity_change: +e.qty.toFixed(4),
      stock_before: before,
      stock_after: before + e.qty,
      unit_cost: s.cost_per_unit || 0,
      total_cost: +((s.cost_per_unit || 0) * e.qty).toFixed(4),
      notes: `Toppings: ${[...e.names].join(', ')}`,
    });
  }
  if (logs.length) await base44.entities.InventoryAdjustment.bulkCreate(logs);
}