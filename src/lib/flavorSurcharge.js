/**
 * Lógica compartida de sabores entre el POS y el menú móvil.
 * Mantiene idéntico el cálculo del recargo por sabores Premium/Sorbete.
 */

/** Divide los gramos equitativamente; el último slot absorbe el redondeo. */
export function splitGramsEqually(totalGrams, n) {
  const base = Math.floor(totalGrams / n);
  const arr = Array.from({ length: n }, () => base);
  arr[n - 1] = totalGrams - base * (n - 1);
  return arr;
}

/** $/g de recargo de la receta vinculada a una bandeja (0 si es Regular). */
export function traySurchargePerGram(trayId, trays = [], recipes = []) {
  const tray = trays.find((t) => t.id === trayId);
  if (!tray) return 0;
  const recipe = recipes.find(
    (r) => (tray.recipe_id && r.id === tray.recipe_id) || r.name === tray.recipe_name
  );
  if (!recipe || (recipe.flavor_tag || 'Regular') === 'Regular') return 0;
  return recipe.surcharge_per_gram || 0;
}

/** Recargo total de una selección de sabores: Σ gramos × $/g. */
export function computeFlavorSurcharge(flavors = [], trays = [], recipes = []) {
  return flavors.reduce((sum, f) => {
    if (!f.tray_id) return sum;
    return sum + (parseFloat(f.grams) || 0) * traySurchargePerGram(f.tray_id, trays, recipes);
  }, 0);
}