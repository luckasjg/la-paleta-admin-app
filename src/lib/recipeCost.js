// Costeo teórico de recetas: mezcla base (ingredients) + variegados post-mantecado.
// Recetas derivadas (base_recipe_id) suman además: base_quantity_grams × costo/g de la Base Maestra.
// `recipes` es opcional: sin él, una derivada se costea solo con sus insumos propios.

export const recipeVariegatos = (recipe) => recipe?.variegatos || [];

const findBase = (recipe, recipes) =>
  recipe?.base_recipe_id ? (recipes || []).find((r) => r.id === recipe.base_recipe_id && r.id !== recipe.id) : null;

export function ownSuppliesCost(recipe, supplies = []) {
  const all = [...(recipe?.ingredients || []), ...recipeVariegatos(recipe)];
  return all.reduce((sum, ing) => {
    const supply = supplies.find((s) => s.id === ing.supply_id);
    return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
  }, 0);
}

export function recipeTheoreticalCost(recipe, supplies = [], recipes = []) {
  const own = ownSuppliesCost(recipe, supplies);
  const base = findBase(recipe, recipes);
  if (!base) return own;
  const baseCpg = recipeTheoreticalCostPerGram(base, supplies, []);
  return own + (recipe.base_quantity_grams || 0) * baseCpg;
}

// Solo los variegados en gramos suman peso (ml/unidad no se asumen como gramos).
export function variegatoGrams(recipe) {
  return recipeVariegatos(recipe)
    .filter((v) => v.unit === 'g')
    .reduce((sum, v) => sum + (v.quantity || 0), 0);
}

export function recipeTheoreticalYield(recipe, fallback = 1000, recipes = []) {
  if (findBase(recipe, recipes)) {
    const ownG = (recipe.ingredients || []).filter((i) => i.unit === 'g').reduce((s, i) => s + (i.quantity || 0), 0);
    return (recipe.base_quantity_grams || 0) + ownG + variegatoGrams(recipe);
  }
  return (recipe?.yield_amount || fallback) + variegatoGrams(recipe);
}

export function recipeTheoreticalCostPerGram(recipe, supplies = [], recipes = []) {
  const y = recipeTheoreticalYield(recipe, 1000, recipes);
  return y > 0 ? recipeTheoreticalCost(recipe, supplies, recipes) / y : 0;
}

export const isMasterBase = (r) => r?.is_master_base === true;