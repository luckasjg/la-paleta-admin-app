import { useMemo } from 'react';

const IVA_RATE = 0.16;
const FALLBACK_MARGIN_PCT = 50;

const isIceCreamRecipe = (r) => {
  const t = (r?.type || '').toLowerCase();
  const c = (r?.category || '').toLowerCase();
  return t === 'helado' || t === 'sorbete' || c === 'helado' || c === 'sorbete';
};

function recipeCostPerGram(recipe, supplies) {
  if (!recipe?.ingredients?.length) return 0;
  const totalIngredientCost = recipe.ingredients.reduce((sum, ing) => {
    const supply = supplies.find(s => s.id === ing.supply_id);
    if (!supply || !supply.cost_per_unit) return sum;
    return sum + (supply.cost_per_unit * (ing.quantity || 0));
  }, 0);
  const yieldAmt = recipe.yield_amount || 1000;
  return yieldAmt > 0 ? totalIngredientCost / yieldAmt : 0;
}

/**
 * Calculates the average contribution margin (%) across all active ice cream
 * presentations × flavors, using the same logic as the Profitability Matrix.
 *
 * Returns: { marginPct, usingFallback, sampleCount, details }
 */
export function useAverageMargin({ recipes = [], products = [], supplies = [], fixedServiceCosts = 0 }) {
  return useMemo(() => {
    const flavors = recipes.filter(r => r.is_active !== false && isIceCreamRecipe(r));
    const presentations = products.filter(p => p.grams_per_serving && p.is_active !== false && p.price > 0);

    if (flavors.length === 0 || presentations.length === 0) {
      return {
        marginPct: FALLBACK_MARGIN_PCT,
        usingFallback: true,
        sampleCount: 0,
        flavorsCount: flavors.length,
        presentationsCount: presentations.length,
      };
    }

    const supplyCostById = (id) => {
      if (!id) return 0;
      const s = supplies.find(x => x.id === id);
      return s?.cost_per_unit || 0;
    };

    const flavorCostPerGram = {};
    flavors.forEach(r => { flavorCostPerGram[r.id] = recipeCostPerGram(r, supplies); });

    let marginSum = 0;
    let count = 0;

    flavors.forEach(flavor => {
      const costPerGram = flavorCostPerGram[flavor.id] || 0;
      presentations.forEach(p => {
        const grams = p.grams_per_serving || 0;
        const iceCreamCost = costPerGram * grams;
        const utensilCost = supplyCostById(p.utensil_supply_id);
        const totalCost = iceCreamCost + utensilCost + fixedServiceCosts;
        const basePrice = p.price / (1 + IVA_RATE);
        if (basePrice <= 0) return;
        const aporte = basePrice - totalCost;
        const marginPct = (aporte / basePrice) * 100;
        marginSum += marginPct;
        count += 1;
      });
    });

    if (count === 0) {
      return {
        marginPct: FALLBACK_MARGIN_PCT,
        usingFallback: true,
        sampleCount: 0,
        flavorsCount: flavors.length,
        presentationsCount: presentations.length,
      };
    }

    return {
      marginPct: marginSum / count,
      usingFallback: false,
      sampleCount: count,
      flavorsCount: flavors.length,
      presentationsCount: presentations.length,
    };
  }, [recipes, products, supplies, fixedServiceCosts]);
}

export const MARGIN_FALLBACK_PCT = FALLBACK_MARGIN_PCT;