// Costeo teórico de recetas: mezcla base (ingredients) + variegados post-mantecado.
// Recetas antiguas sin variegados se tratan como variegatos = [].

export const recipeVariegatos = (recipe) => recipe?.variegatos || [];

export function recipeTheoreticalCost(recipe, supplies = []) {
  const all = [...(recipe?.ingredients || []), ...recipeVariegatos(recipe)];
  return all.reduce((sum, ing) => {
    const supply = supplies.find((s) => s.id === ing.supply_id);
    return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
  }, 0);
}

// Solo los variegados en gramos suman peso (ml/unidad no se asumen como gramos).
export function variegatoGrams(recipe) {
  return recipeVariegatos(recipe)
    .filter((v) => v.unit === 'g')
    .reduce((sum, v) => sum + (v.quantity || 0), 0);
}

export function recipeTheoreticalYield(recipe, fallback = 1000) {
  return (recipe?.yield_amount || fallback) + variegatoGrams(recipe);
}

export function recipeTheoreticalCostPerGram(recipe, supplies = []) {
  const y = recipeTheoreticalYield(recipe);
  return y > 0 ? recipeTheoreticalCost(recipe, supplies) / y : 0;
}