/**
 * Costo de la mercancía vendida (COGS) para un conjunto de ventas.
 *
 * Suma, por cada ítem vendido:
 *  - helados: costo por gramo de la receta de la bandeja × gramos servidos
 *  - productos: todos los insumos vinculados (o el utensilio legado)
 *
 * Extraído del Dashboard para poder calcular también el mes anterior y así
 * comparar el resultado financiero entre periodos.
 */
export function computeCogs({ sales = [], supplies = [], recipes = [], trays = [], products = [] }) {
  const supplyCost = {};
  supplies.forEach(s => { supplyCost[s.id] = s.cost_per_unit || 0; });

  const recipeCostPerGram = {};
  recipes.forEach(recipe => {
    if (!recipe.ingredients?.length) return;
    const ingredientCost = recipe.ingredients.reduce(
      (sum, ing) => sum + (supplyCost[ing.supply_id] || 0) * (ing.quantity || 0),
      0
    );
    const yieldAmt = recipe.yield_amount || 1000;
    recipeCostPerGram[recipe.id] = ingredientCost / yieldAmt;
  });

  let total = 0;
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      if (item.tray_id) {
        const tray = trays.find(t => t.id === item.tray_id);
        const recipeId = tray?.recipe_id;
        const costPerGram = recipeId ? (recipeCostPerGram[recipeId] || 0) : 0;
        total += costPerGram * (item.grams || 0);
      }
      if (item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return;
        const linked = Array.isArray(product.linked_supplies) ? product.linked_supplies : [];
        if (linked.length > 0) {
          for (const ls of linked) {
            total += (supplyCost[ls.supply_id] || 0) * (ls.quantity || 0) * (item.quantity || 1);
          }
        } else if (product.utensil_supply_id) {
          total += (supplyCost[product.utensil_supply_id] || 0) * (item.quantity || 1);
        }
      }
    });
  });

  return total;
}