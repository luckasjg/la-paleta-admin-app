import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const PER_SERVING_CATEGORIES = ['cafe', 'merengada', 'bebida'];

function calcRecipeCostPerServing(recipe, supplies, gramsPerServing, category) {
  if (!recipe || !recipe.ingredients?.length) return 0;
  const totalIngredientCost = recipe.ingredients.reduce((sum, ing) => {
    const supply = supplies.find(s => s.id === ing.supply_id);
    if (!supply || !supply.cost_per_unit) return sum;
    return sum + (supply.cost_per_unit * (ing.quantity || 0));
  }, 0);

  // For drinks (cafe/merengada/bebida) the recipe is formulated for 1 serving — return as-is
  const cat = (category || recipe.type || '').toLowerCase();
  if (PER_SERVING_CATEGORIES.includes(cat)) {
    return totalIngredientCost;
  }

  // For ice cream (and others), scale by grams per serving
  const yieldAmt = recipe.yield_amount || 1000;
  const grams = gramsPerServing && gramsPerServing > 0 ? gramsPerServing : 150;
  return (totalIngredientCost / yieldAmt) * grams;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-36">
      <p className="font-semibold text-sm">{d.fullName}</p>
      <p>Precio venta: <span className="font-mono font-semibold">${d.salePrice.toFixed(2)}</span></p>
      <p>Costo estimado: <span className="font-mono text-amber-600">${d.cost.toFixed(2)}</span></p>
      <p>Margen: <span className={`font-mono font-bold ${d.margin >= 50 ? 'text-emerald-600' : d.margin >= 20 ? 'text-amber-600' : 'text-destructive'}`}>{d.margin.toFixed(1)}%</span></p>
    </div>
  );
};

export default function ProfitMarginChart({ products, recipes, supplies }) {
  const data = useMemo(() => {
    return products
      .filter(p => p.price > 0 && p.is_active !== false)
      .map(product => {
        let cost = 0;

        // Cost from recipe (if linked) — drinks vs ice cream handled inside helper
        if (product.recipe_id) {
          const recipe = recipes.find(r => r.id === product.recipe_id);
          if (recipe) {
            cost += calcRecipeCostPerServing(recipe, supplies, product.grams_per_serving, product.category);
          }
        }

        // Cost from utensil
        if (product.utensil_supply_id) {
          const utensil = supplies.find(s => s.id === product.utensil_supply_id);
          if (utensil?.cost_per_unit) cost += utensil.cost_per_unit;
        }

        const margin = cost > 0 ? ((product.price - cost) / product.price) * 100 : null;

        return {
          name: product.name.length > 14 ? product.name.slice(0, 14) + '…' : product.name,
          fullName: product.name,
          salePrice: product.price,
          cost,
          margin: margin !== null ? margin : 0,
          hasData: cost > 0,
        };
      })
      .filter(d => d.hasData)
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }, [products, recipes, supplies]);

  const getColor = (margin) => {
    if (margin >= 60) return 'hsl(152,45%,40%)';
    if (margin >= 35) return 'hsl(45,80%,48%)';
    return 'hsl(0,55%,45%)';
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Margen por Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Vincula recetas y utensilios a los productos para ver los márgenes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Margen de Ganancia por Producto
          <span className="font-normal text-muted-foreground text-xs ml-1">(precio venta vs costo ingredientes + envase)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(30,15%,88%)" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="margin" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={getColor(entry.margin)} />
              ))}
              <LabelList dataKey="margin" position="right" formatter={v => `${v.toFixed(0)}%`} style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-end text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" /> ≥60%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> 35–59%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(0,55%,45%)' }} /> &lt;35%</span>
        </div>
      </CardContent>
    </Card>
  );
}