import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Grid3x3 } from 'lucide-react';

const IVA_RATE = 0.16;

const isIceCreamRecipe = (r) => {
  const t = (r.type || '').toLowerCase();
  const c = (r.category || '').toLowerCase();
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

export default function ProfitabilityMatrix({ recipes, products, supplies, fixedServiceCosts }) {
  const flavors = useMemo(
    () => recipes.filter(r => r.is_active !== false && isIceCreamRecipe(r)),
    [recipes]
  );

  const presentations = useMemo(
    () => products
      .filter(p => p.grams_per_serving && p.is_active !== false && p.price > 0)
      .sort((a, b) => (a.grams_per_serving || 0) - (b.grams_per_serving || 0)),
    [products]
  );

  const recipeCosts = useMemo(() => {
    const map = {};
    flavors.forEach(r => { map[r.id] = recipeCostPerGram(r, supplies); });
    return map;
  }, [flavors, supplies]);

  const supplyCost = (id) => {
    if (!id) return 0;
    const s = supplies.find(x => x.id === id);
    return s?.cost_per_unit || 0;
  };

  if (flavors.length === 0 || presentations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-primary" />
            Matriz de Rentabilidad por Sabor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            {flavors.length === 0
              ? 'No hay recetas de helado/sorbete activas.'
              : 'No hay productos con "Requiere sabor" activado.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-primary" />
          Matriz de Rentabilidad por Sabor
          <span className="font-normal text-muted-foreground text-xs ml-1">
            (aporte neto por cada combinación sabor × presentación)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">
                  Sabor / Presentación
                </TableHead>
                {presentations.map(p => {
                  const basePrice = p.price / (1 + IVA_RATE);
                  return (
                    <TableHead key={p.id} className="text-center min-w-[160px] border-l">
                      <div className="font-semibold text-foreground text-xs">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {p.grams_per_serving || 0}g · {p.max_flavors || 1} sabor{(p.max_flavors || 1) > 1 ? 'es' : ''}
                      </div>
                      <div className="flex justify-center gap-2 mt-1 font-mono text-[11px]">
                        <span title="Precio sin IVA">Base: ${basePrice.toFixed(2)}</span>
                        <span className="text-muted-foreground" title="Precio de venta (incluye IVA 16%)">
                          c/IVA: ${p.price.toFixed(2)}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {flavors.map(flavor => {
                const costPerGram = recipeCosts[flavor.id] || 0;
                return (
                  <TableRow key={flavor.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm border-r">
                      <div>{flavor.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        ${costPerGram.toFixed(4)}/g
                      </div>
                    </TableCell>
                    {presentations.map(p => {
                      const grams = p.grams_per_serving || 0;
                      const iceCreamCost = costPerGram * grams;
                      const utensilCost = supplyCost(p.utensil_supply_id);
                      const fixedCost = utensilCost + fixedServiceCosts;
                      const totalCost = iceCreamCost + fixedCost;
                      const basePrice = p.price / (1 + IVA_RATE);
                      const aporte = basePrice - totalCost;
                      const isProfit = aporte >= 0;

                      return (
                        <TableCell key={p.id} className="border-l align-top p-2">
                          <div className="space-y-0.5 text-[11px] font-mono">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Helado:</span>
                              <span>${iceCreamCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Fijos:</span>
                              <span>${fixedCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-0.5 font-semibold text-foreground">
                              <span>Costo:</span>
                              <span>${totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-foreground">
                              <span>Venta s/IVA:</span>
                              <span>${basePrice.toFixed(2)}</span>
                            </div>
                            <div
                              className={`flex justify-between font-bold rounded px-1.5 py-0.5 mt-1 ${
                                isProfit
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              <span>Aporte:</span>
                              <span>
                                {aporte >= 0 ? '+' : ''}${aporte.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
          💡 <strong>Costo Helado</strong> = costo/g de la receta × gramos del producto.{' '}
          <strong>Costo Fijos</strong> = envase/utensilio vinculado + costos fijos de servicio.{' '}
          <strong>Aporte</strong> = Precio sin IVA − Costo Total (el precio de venta ya incluye IVA 16%).
        </div>
      </CardContent>
    </Card>
  );
}