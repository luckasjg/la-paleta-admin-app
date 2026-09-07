// productionSubstitutes.js
// Lógica de sustitución de insumos al producir una bandeja.
//
// Caso de uso: la receta pide un insumo de una marca/presentación concreta que no
// tiene stock, pero en inventario existe el mismo insumo bajo otra marca. El
// operario elige un sustituto al vuelo y la producción se descuenta de ése.
//
// Regla de seguridad: sólo se ofrecen sustitutos con la MISMA unidad de medida
// (g↔g, ml↔ml, unidad↔unidad) y con stock en la ubicación origen elegida.

import { getStockAt } from '@/lib/stockHelpers';

export const SUBSTITUTION_REASON = 'sustitucion_produccion';

/**
 * Candidatos válidos para sustituir un ingrediente faltante.
 */
export function findSubstituteCandidates({ supplies, unit, needed, sourceLocation, excludeId }) {
  return supplies
    .filter((s) => s.id !== excludeId)
    .filter((s) => (s.unit || '') === unit)
    .filter((s) => s.is_infinite === true || getStockAt(s, sourceLocation) >= needed)
    .map((s) => ({
      id: s.id,
      name: s.name,
      unit: s.unit,
      available: s.is_infinite ? Infinity : getStockAt(s, sourceLocation),
      isInfinite: s.is_infinite === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/**
 * Construye el plan de consumo de la producción: por cada ingrediente de la receta,
 * el insumo efectivamente usado (original o sustituto), lo requerido y su estado.
 *
 * @param {Object[]} substitutions - map índice → { supply_id, save_preferred }
 */
export function buildIngredientPlan({
  recipe,
  grams,
  supplies,
  sourceLocation,
  substitutions = {},
  resolveSupply,
}) {
  if (!recipe || !grams) return [];
  const multiplier = grams / (recipe.yield_amount || 1);

  return (recipe.ingredients || []).map((ing, index) => {
    const original = resolveSupply(ing);
    const needed = (ing.quantity || 0) * multiplier;
    const unit = original?.unit || ing.unit || '';

    const pick = substitutions[index];
    const substitute = pick?.supply_id ? supplies.find((s) => s.id === pick.supply_id) : null;
    const effective = substitute || original;

    const isInfinite = effective?.is_infinite === true;
    const available = effective ? getStockAt(effective, sourceLocation) : 0;
    const missing = !effective || (!isInfinite && available < needed);

    return {
      index,
      ing,
      needed,
      unit,
      original,
      originalName: original?.name || ing.supply_name || 'Insumo desconocido',
      substitute,
      effective,
      isSubstituted: Boolean(substitute),
      savePreferred: pick?.save_preferred === true,
      available,
      isInfinite,
      missing,
      notFound: !original,
      relinked: original && ing.supply_id && original.id !== ing.supply_id,
      candidates: findSubstituteCandidates({
        supplies,
        unit,
        needed,
        sourceLocation,
        excludeId: original?.id,
      }),
    };
  });
}

/**
 * Costo real de la producción: se calcula con el cost_per_unit del insumo
 * efectivamente usado (el sustituto cuando aplica), no el teórico de la receta.
 */
export function computeRealCost(plan) {
  return plan.reduce(
    (sum, row) => sum + row.needed * (row.effective?.cost_per_unit || 0),
    0
  );
}