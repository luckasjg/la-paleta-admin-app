// Lógica de lote de producción: variegados reales y resumen de costo / merma.
import { getStockAt } from '@/lib/stockHelpers';
import { computeRealCost } from '@/lib/productionSubstitutes';

/**
 * Variegados del lote: los de la receta (escalados por multiplicador) + adicionales.
 * overrides: key → cantidad real; extras: [{ key, supply_id, supply_name, unit }]
 */
export function buildVariegatoPlan({ recipe, multiplier, overrides = {}, extras = [], sourceLocation, resolveSupply }) {
  const base = (recipe?.variegatos || []).map((v, i) => ({
    key: `r${i}`, ing: v, planned: (v.quantity || 0) * (multiplier || 0), isExtra: false,
  }));
  const extra = extras.map((e) => ({ key: e.key, ing: e, planned: 0, isExtra: true }));
  return [...base, ...extra].map((l) => {
    const supply = resolveSupply(l.ing);
    const quantity = overrides[l.key] ?? l.planned;
    const isInfinite = supply?.is_infinite === true;
    const available = supply ? getStockAt(supply, sourceLocation) : 0;
    return {
      ...l,
      supply,
      name: supply?.name || l.ing.supply_name || 'Insumo desconocido',
      unit: supply?.unit || l.ing.unit || '',
      quantity,
      available,
      isInfinite,
      missing: quantity > 0 && (!supply || (!isInfinite && available < quantity)),
    };
  });
}

/** Peso esperado incluye solo insumos en gramos. */
export function computeBatchSummary(plan, varPlan, netGrams) {
  const baseCost = computeRealCost(plan);
  const varCost = varPlan.reduce((s, l) => s + l.quantity * (l.supply?.cost_per_unit || 0), 0);
  const totalCost = baseCost + varCost;
  const expected =
    plan.filter((r) => r.unit === 'g').reduce((s, r) => s + r.needed, 0) +
    varPlan.filter((l) => l.unit === 'g').reduce((s, l) => s + l.quantity, 0);
  const loss = expected - (netGrams || 0);
  return {
    baseCost,
    totalCost,
    costPerGram: netGrams > 0 ? totalCost / netGrams : 0,
    expected,
    loss,
    lossPct: expected > 0 ? (loss / expected) * 100 : 0,
  };
}