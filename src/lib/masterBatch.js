// Cálculos del lote de Base Maestra → bandejas derivadas.
import { getStockAt } from '@/lib/stockHelpers';

export const BALANCE_TOLERANCE_G = 0.5;

/** Líneas propias (saborizantes + variegados) de una bandeja derivada, escaladas por gramos de base. */
export function buildDerivedLines(recipe, baseGrams, overrides = {}, resolveSupply) {
  if (!recipe) return [];
  const std = recipe.base_quantity_grams || 0;
  const factor = std > 0 ? (baseGrams || 0) / std : 0;
  const mk = (kind) => (ing, i) => {
    const key = `${kind}${i}`;
    const planned = (ing.quantity || 0) * factor;
    const supply = resolveSupply(ing);
    return {
      key, kind, ing, planned, supply,
      quantity: overrides[key] ?? planned,
      name: supply?.name || ing.supply_name || 'Insumo desconocido',
      unit: supply?.unit || ing.unit || '',
    };
  };
  return [...(recipe.ingredients || []).map(mk('i')), ...(recipe.variegatos || []).map(mk('v'))];
}

export function derivedTraySummary({ lines, baseGrams, baseCpg, net }) {
  const ownCost = lines.reduce((s, l) => s + (l.quantity || 0) * (l.supply?.cost_per_unit || 0), 0);
  const ownGrams = lines.filter((l) => l.unit === 'g' || l.unit === 'ml').reduce((s, l) => s + (l.quantity || 0), 0);
  const totalCost = (baseGrams || 0) * baseCpg + ownCost;
  const expected = (baseGrams || 0) + ownGrams;
  return {
    ownCost,
    totalCost,
    expected,
    costPerGram: net > 0 ? totalCost / net : 0,
    loss: expected - (net || 0),
  };
}

/** Agrupa descuentos por insumo y detecta faltantes en la ubicación de origen. */
export function aggregateDeductions(entries, location) {
  const map = {};
  entries.forEach(({ supply, qty, name, unit }) => {
    if (!(qty > 0)) return;
    if (!supply) { map[`missing:${name}`] = { supply: null, qty, name, unit }; return; }
    if (supply.is_infinite) return;
    map[supply.id] = { supply, qty: (map[supply.id]?.qty || 0) + qty, name: supply.name, unit: supply.unit };
  });
  const list = Object.values(map);
  const missing = list.filter((d) => !d.supply || getStockAt(d.supply, location) < d.qty);
  return { list: list.filter((d) => d.supply), missing };
}

export const splitEvenly = (total, n) => (n > 0 ? Math.round((total / n) * 10) / 10 : 0);