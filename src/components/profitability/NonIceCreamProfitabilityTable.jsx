import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Coffee, Search } from 'lucide-react';

const IVA_RATE = 0.16;

// Categorías que SÍ son helado — las excluimos de esta vista.
const ICE_CREAM_PRODUCT_CATEGORIES = new Set([
  'helado', 'helados',
  'barquilla', 'barquillas',
  'llevar',
  'tina', 'tinas',
  'cono', 'conos',
  'paleta', 'paletas',
  'copa', 'copas',
]);

const isIceCreamProduct = (p) => {
  const cat = (p.category || '').trim().toLowerCase();
  return ICE_CREAM_PRODUCT_CATEGORIES.has(cat);
};

function recipeCostTotal(recipe, supplies) {
  if (!recipe?.ingredients?.length) return 0;
  return recipe.ingredients.reduce((sum, ing) => {
    const supply = supplies.find(s => s.id === ing.supply_id);
    if (!supply || !supply.cost_per_unit) return sum;
    return sum + (supply.cost_per_unit * (ing.quantity || 0));
  }, 0);
}

export default function NonIceCreamProfitabilityTable({ products, recipes, supplies, fixedServiceCosts }) {
  const [search, setSearch] = useState('');

  const supplyCost = (id) => {
    if (!id) return 0;
    const s = supplies.find(x => x.id === id);
    return s?.cost_per_unit || 0;
  };

  // Productos no-helado activos con precio > 0
  const rows = useMemo(() => {
    const filtered = products.filter(p =>
      !isIceCreamProduct(p) &&
      p.is_active !== false &&
      (p.price || 0) > 0
    );

    return filtered.map(p => {
      // Costo de receta vinculada (café, merengadas) → costo por porción según yield
      let recipeCost = 0;
      if (p.recipe_id) {
        const r = recipes.find(x => x.id === p.recipe_id);
        if (r) {
          const total = recipeCostTotal(r, supplies);
          const yieldAmt = r.yield_amount || 1;
          // El producto representa 1 porción del rendimiento de la receta
          recipeCost = yieldAmt > 0 ? total / yieldAmt : total;
        }
      }

      // Costo de insumos vinculados (envases, ingredientes adicionales, productos venta directa)
      const linked = Array.isArray(p.linked_supplies) ? p.linked_supplies : [];
      const linkedCost = linked.length > 0
        ? linked.reduce((sum, ls) => sum + supplyCost(ls.supply_id) * (ls.quantity || 0), 0)
        : supplyCost(p.utensil_supply_id);

      const variableCost = recipeCost + linkedCost;
      const totalCost = variableCost + fixedServiceCosts;
      const basePrice = p.price / (1 + IVA_RATE);
      const aporte = basePrice - totalCost;
      const margin = basePrice > 0 ? (aporte / basePrice) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'Sin categoría',
        size_label: p.size_label,
        recipeCost,
        linkedCost,
        variableCost,
        totalCost,
        price: p.price,
        basePrice,
        aporte,
        margin,
      };
    }).sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      return c !== 0 ? c : a.name.localeCompare(b.name);
    });
  }, [products, recipes, supplies, fixedServiceCosts]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            Rentabilidad de Productos (No Helado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay productos no-helado activos con precio definido.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Coffee className="h-4 w-4 text-primary" />
          Rentabilidad de Productos (No Helado)
          <span className="font-normal text-muted-foreground text-xs ml-1">
            (café, merengadas, venta directa, adicionales, etc.)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Producto</TableHead>
                <TableHead className="text-xs">Categoría</TableHead>
                <TableHead className="text-right text-xs" title="Costo de receta vinculada (por porción)">
                  Costo Receta
                </TableHead>
                <TableHead className="text-right text-xs" title="Insumos/envases vinculados al producto">
                  Insumos
                </TableHead>
                <TableHead className="text-right text-xs">Fijos</TableHead>
                <TableHead className="text-right text-xs font-semibold">Costo Total</TableHead>
                <TableHead className="text-right text-xs">Venta c/IVA</TableHead>
                <TableHead className="text-right text-xs">Venta s/IVA</TableHead>
                <TableHead className="text-right text-xs font-semibold">Aporte</TableHead>
                <TableHead className="text-right text-xs">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(r => {
                const isProfit = r.aporte >= 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div>{r.name}</div>
                      {r.size_label && (
                        <div className="text-[10px] text-muted-foreground">{r.size_label}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      ${r.recipeCost.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      ${r.linkedCost.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      ${fixedServiceCosts.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      ${r.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      ${r.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ${r.basePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                        isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isProfit ? '+' : ''}${r.aporte.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className={isProfit ? 'text-green-700' : 'text-red-700'}>
                        {r.margin.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">
                    No hay coincidencias con "{search}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-[11px] text-muted-foreground border-t pt-3">
          💡 <strong>Costo Receta</strong> = costo de ingredientes ÷ rendimiento de la receta vinculada (por porción).{' '}
          <strong>Insumos</strong> = suma de insumos/envases vinculados.{' '}
          <strong>Aporte</strong> = Precio sin IVA − Costo Total.{' '}
          <strong>Margen</strong> = Aporte / Precio sin IVA.
        </div>
      </CardContent>
    </Card>
  );
}