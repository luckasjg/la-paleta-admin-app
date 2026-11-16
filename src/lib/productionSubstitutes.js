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
  variations = {},
  multiplier: batchMultiplier,
  resolveSupply,
}) {
  if (!recipe) return [];
  const multiplier = batchMultiplier ?? (grams ? grams / (recipe.yield_amount || 1) : 0);
  if (!multiplier) return [];

  // Aportes de sustituciones compuestas: supply_id → [{ from, quantity }]
  const contributions = {};
  Object.entries(variations).forEach(([key, v]) => {
    if (v?.status !== 'substituted') return;
    const fromName = (recipe.ingredients || [])[key]?.supply_name || '';
    (v.targets || []).forEach((t) => {
      if (!t.supply_id || !(t.quantity > 0)) return;
      (contributions[t.supply_id] ||= []).push({ from: key, fromName, quantity: t.quantity });
    });
  });
  const used = new Set();

  const rows = (recipe.ingredients || []).map((ing, index) => {
    const original = resolveSupply(ing);
    const planned = (ing.quantity || 0) * multiplier;
    // Variación solo para este lote: omitido / sustituido (0) o ajustado (cantidad real)
    const variation = variations[index] || null;
    const ownQty = variation?.status === 'omitted' || variation?.status === 'substituted'
      ? 0
      : variation?.status === 'adjusted' ? (variation.actual_quantity || 0) : planned;
    const pickId = substitutions[index]?.supply_id;
    const effId = (pickId ? supplies.find((s) => s.id === pickId) : original)?.id;
    const contrib = effId && !used.has(effId) ? (contributions[effId] || []) : [];
    if (contrib.length) used.add(effId);
    const subAdded = contrib.reduce((s, c) => s + c.quantity, 0);
    const needed = ownQty + subAdded;
    const unit = original?.unit || ing.unit || '';

    const pick = substitutions[index];
    const substitute = pick?.supply_id ? supplies.find((s) => s.id === pick.supply_id) : null;
    const effective = substitute || original;

    const isInfinite = effective?.is_infinite === true;
    const available = effective ? getStockAt(effective, sourceLocation) : 0;
    const missing = needed > 0 && (!effective || (!isInfinite && available < needed));

    return {
      index,
      ing,
      planned,
      variation,
      needed,
      ownQty,
      subAdded,
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

  // Filas agregadas solo a este lote: destinos de sustitución que no estaban en la
  // receta (is_added_substitute) e insumos extra puntuales.
  const addedRow = (index, supply, needed, variation) => {
    const isInfinite = supply?.is_infinite === true;
    const available = supply ? getStockAt(supply, sourceLocation) : 0;
    return {
      index, ing: { supply_id: supply?.id, supply_name: supply?.name }, planned: 0, variation,
      needed, ownQty: needed, subAdded: 0, unit: supply?.unit || '', original: supply,
      originalName: supply?.name || 'Insumo desconocido', substitute: null, effective: supply,
      isSubstituted: false, savePreferred: false, available, isInfinite,
      missing: needed > 0 && (!supply || (!isInfinite && available < needed)),
      notFound: !supply, relinked: false, candidates: [], isAdded: true,
    };
  };
  Object.entries(contributions).forEach(([supplyId, list]) => {
    if (used.has(supplyId)) return;
    const qty = list.reduce((s, c) => s + c.quantity, 0);
    rows.push(addedRow(`s-${supplyId}`, supplies.find((s) => s.id === supplyId), qty, {
      status: 'added_substitute', is_added_substitute: true, actual_quantity: qty,
      reason: `Sustituye a ${list.map((c) => c.fromName).join(', ')}`,
    }));
  });
  Object.entries(variations).forEach(([key, v]) => {
    if (v?.status !== 'extra') return;
    rows.push(addedRow(key, supplies.find((s) => s.id === v.supply_id), v.actual_quantity || 0, v));
  });
  return rows;
}

/** Registro de trazabilidad (Tray.ingredient_variations) de una fila con variación. */
export function toVariationRecord(r, supplies) {
  const v = r.variation;
  return {
    supply_id: r.effective?.id || r.ing.supply_id || '',
    supply_name: r.isSubstituted ? r.substitute.name : r.originalName,
    status: v.status,
    planned_quantity: r.planned,
    actual_quantity: r.needed,
    unit: r.unit,
    reason: v.reason || '',
    ...(v.is_added_substitute || v.status === 'extra' ? { is_added_substitute: v.status !== 'extra' } : {}),
    ...(v.targets ? { targets: v.targets.map((t) => ({ ...t, supply_name: supplies.find((s) => s.id === t.supply_id)?.name || '' })) } : {}),
    ...(v.factors ? { factors: { divisor_glucosa: v.factors.glucosa, divisor_azucar: v.factors.azucar } } : {}),
  };
}

/** Fórmula de equivalencia del azúcar invertido → glucosa + azúcar. */
export function invertSugarFormula(planned, divGlucosa = 1.144, divAzucar = 1.43) {
  const mitad = planned / 2;
  return { glucosa: mitad / (divGlucosa || 1), azucar: mitad / (divAzucar || 1) };
}

export function findSupplyByName(supplies, test) {
  return supplies.find((s) => test((s.name || '').toLowerCase()));
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