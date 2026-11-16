// Descuento de inventario con trazabilidad (saldo antes/después) para producción.
import { base44 } from '@/api/base44Client';
import { getStockAt, buildStockDelta } from '@/lib/stockHelpers';

export const CONSUMPTION_REASON = 'consumo_produccion';
export const CONSUMPTION_TYPE = 'production_consumption';

export const makeProductionRef = (prefix = 'P') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Descuenta cada insumo de la ubicación indicada, leyendo el saldo real al momento,
 * y registra un InventoryAdjustment por insumo. Devuelve el deduction_log.
 * entries: [{ supply, qty }] — ctx: { location, referenceId, referenceLabel, origin }
 */
export async function deductWithLog(entries, { location, referenceId, referenceLabel, origin, isCorrection = false }) {
  const grouped = {};
  entries.forEach(({ supply, qty }) => {
    if (!supply || supply.is_infinite || !(qty > 0)) return;
    grouped[supply.id] = { supply, qty: (grouped[supply.id]?.qty || 0) + qty };
  });
  const log = [];
  const adjustments = [];
  for (const { supply, qty } of Object.values(grouped)) {
    const fresh = (await base44.entities.Supply.get(supply.id).catch(() => null)) || supply;
    const before = getStockAt(fresh, location);
    const payload = buildStockDelta(fresh, location, -qty);
    await base44.entities.Supply.update(supply.id, payload);
    const after = location === 'warehouse' ? payload.stock_warehouse : payload.stock_production;
    const unitCost = fresh.cost_per_unit || 0;
    log.push({
      supply_id: supply.id, supply_name: fresh.name, quantity: qty, unit: fresh.unit,
      location, stock_before: before, stock_after: after, verified: true,
    });
    adjustments.push({
      type: CONSUMPTION_TYPE, reason: CONSUMPTION_REASON,
      reference_id: referenceId, reference_name: fresh.name, reference_label: referenceLabel,
      supply_id: supply.id, supply_name: fresh.name, unit: fresh.unit, category: fresh.category || '',
      quantity_change: -qty, location, origin,
      stock_before: before, stock_after: after,
      unit_cost: unitCost, total_cost: unitCost * qty,
      notes: isCorrection ? `Corrección de descuento faltante · ${referenceLabel}` : referenceLabel,
      is_correction: isCorrection,
    });
  }
  if (adjustments.length) await base44.entities.InventoryAdjustment.bulkCreate(adjustments);
  return log;
}