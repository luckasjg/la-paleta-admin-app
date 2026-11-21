// Auditoría: consumo esperado de una producción vs. movimientos de inventario registrados.
const TOL = 0.005; // 0.5% de tolerancia por redondeos

const findRecipe = (recipes, id, name) =>
  recipes.find(r => r.id === id) || recipes.find(r => (r.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase());

function addTo(map, id, name, unit, qty) {
  if (!id || !(qty > 0)) return;
  const cur = map[id] || { supply_id: id, supply_name: name, unit, quantity: 0 };
  cur.quantity += qty;
  map[id] = cur;
}

/** Ingredientes × multiplicador con variaciones y sustituciones registradas. */
function addIngredients(map, ingredients, factor, variations = [], substitutions = []) {
  const varById = Object.fromEntries(variations.filter(v => v.supply_id).map(v => [v.supply_id, v]));
  const subById = Object.fromEntries(substitutions.map(s => [s.original_supply_id, s]));
  (ingredients || []).forEach(ing => {
    const v = varById[ing.supply_id];
    const s = subById[ing.supply_id];
    const planned = (ing.quantity || 0) * factor;
    if (v?.status === 'omitted') return;
    if (v?.status === 'adjusted') return addTo(map, ing.supply_id, ing.supply_name, ing.unit, v.actual_quantity || 0);
    if (v?.status === 'substituted') {
      if (v.targets?.length) return v.targets.forEach(t => addTo(map, t.supply_id, t.supply_name, ing.unit, t.quantity || 0));
      return;
    }
    if (s) return addTo(map, s.substitute_supply_id, s.substitute_supply_name, s.unit || ing.unit, s.quantity || planned);
    addTo(map, ing.supply_id, ing.supply_name, ing.unit, planned);
  });
  variations.filter(v => v.status === 'extra' || v.status === 'added_substitute')
    .forEach(v => addTo(map, v.supply_id, v.supply_name, v.unit, v.actual_quantity || 0));
}

const addVariegatos = (map, list = []) => list.forEach(l => addTo(map, l.supply_id, l.supply_name, l.unit, l.quantity || 0));

/** Registro de lote (bandeja o entrada de refill_log) que corresponde a un evento independiente. */
export function batchForEvent(event, tray) {
  if (!tray) return null;
  if (event.type === 'relleno') {
    const log = tray.refill_log || [];
    return log.find(r => event.production_ref && r.production_ref === event.production_ref)
      || log.find(r => r.date === event.date && Math.abs((r.grams_added || 0) - (event.grams || 0)) < 0.5) || null;
  }
  if (event.production_ref && tray.production_ref === event.production_ref) return tray;
  return (tray.refill_count || 0) === 0 ? tray : { ...tray, ingredient_variations: [], variegatos_used: [], batch_multiplier: null };
}

export function expectedForSingle(event, tray, recipes, suppliesById) {
  const batch = batchForEvent(event, tray);
  if (!batch) return [];
  if (batch.deduction_log?.length) return finalize(Object.fromEntries(batch.deduction_log.map(d => [d.supply_id, { ...d }])), suppliesById);
  const recipe = findRecipe(recipes, tray.recipe_id, tray.recipe_name);
  const map = {};
  const mult = batch.batch_multiplier || 1;
  addIngredients(map, recipe?.ingredients, mult, batch.ingredient_variations || [], batch.substitutions || tray.substitutions || []);
  if (batch.variegatos_used?.length) addVariegatos(map, batch.variegatos_used);
  else (recipe?.variegatos || []).forEach(v => addTo(map, v.supply_id, v.supply_name, v.unit, (v.quantity || 0) * mult));
  return finalize(map, suppliesById);
}

export function expectedForMaster(item, trays, recipes, suppliesById) {
  if (item.deduction_log?.length) return finalize(Object.fromEntries(item.deduction_log.map(d => [d.supply_id, { ...d }])), suppliesById);
  const map = {};
  const base = findRecipe(recipes, item.base_recipe_id, item.base_name);
  const branchBatches = item.branches.map(b => {
    const t = trays.find(x => x.id === b.tray_id);
    if (!t) return null;
    const entry = (t.refill_log || []).find(r => r.master_batch_id === item.id);
    return entry || (t.master_batch_id === item.id ? t : null);
  });
  const first = branchBatches.find(Boolean);
  const baseVars = (first?.ingredient_variations || []).filter(v => v.reason !== 'Ajuste en lote maestro');
  addIngredients(map, base?.ingredients, item.multiplier || 1, baseVars, first?.substitutions || []);
  item.branches.forEach((b, i) => {
    const bb = branchBatches[i];
    const recipe = findRecipe(recipes, null, b.recipe_name);
    if (!recipe || recipe.id === base?.id) return;
    const factor = recipe.base_quantity_grams > 0 ? (b.base_grams || 0) / recipe.base_quantity_grams : 0;
    const adj = (bb?.ingredient_variations || []).filter(v => v.reason === 'Ajuste en lote maestro');
    addIngredients(map, recipe.ingredients, factor, adj);
    if (bb?.variegatos_used?.length) addVariegatos(map, bb.variegatos_used);
    else (recipe.variegatos || []).forEach(v => addTo(map, v.supply_id, v.supply_name, v.unit, (v.quantity || 0) * factor));
  });
  return finalize(map, suppliesById);
}

/** Lote independiente: lo esperado es el descuento consolidado registrado. */
export const expectedFromLog = (log = [], suppliesById) =>
  finalize(Object.fromEntries(log.map(d => [d.supply_id, { ...d }])), suppliesById);

// Omite insumos infinitos (nunca se descuentan)
function finalize(map, suppliesById) {
  return Object.values(map).filter(e => !suppliesById[e.supply_id]?.is_infinite && e.quantity > 0.0001);
}

/** Compara esperado vs. movimientos registrados de una referencia. */
export function compareDeductions(expected, movements) {
  const deducted = {};
  movements.forEach(m => { deducted[m.supply_id] = (deducted[m.supply_id] || 0) + Math.abs(m.quantity_change || 0); });
  const rows = expected.map(e => {
    const got = deducted[e.supply_id] || 0;
    const diff = Math.max(0, e.quantity - got);
    return { ...e, expected: e.quantity, deducted: got, diff: diff > e.quantity * TOL + 0.01 ? diff : 0 };
  });
  const pending = rows.filter(r => r.diff > 0);
  let status = 'ok';
  if (movements.length === 0) status = 'none';
  else if (pending.length) status = 'partial';
  return { rows, pending, status };
}