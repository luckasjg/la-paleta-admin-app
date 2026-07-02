import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Calculator, Copy } from 'lucide-react';
import { useRole } from '@/lib/useRole';

const TYPES = [
  { value: 'helado', label: 'Helado' },
  { value: 'cafe', label: 'Café' },
  { value: 'merengada', label: 'Merengada' },
  { value: 'otro', label: 'Otro' },
];

export default function RecipeDetailCard({ recipe, supplies, onEdit, onDelete, onClone }) {
  const [mixDeseado, setMixDeseado] = useState('');
  const { isAdmin } = useRole();

  const ingredients = recipe.ingredients || [];
  const totalBaseGrams = ingredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0);

  const mixValue = parseFloat(mixDeseado) || 0;
  const showCalc = mixValue > 0 && totalBaseGrams > 0;

  const calculateCost = () => {
    return ingredients.reduce((sum, ing) => {
      const supply = supplies.find(s => s.id === ing.supply_id);
      return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
    }, 0);
  };

  const cost = isAdmin ? calculateCost() : 0;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{recipe.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{TYPES.find(t => t.value === recipe.type)?.label}</Badge>
              {recipe.flavor_tag && recipe.flavor_tag !== 'Regular' && (
                <Badge
                  className={
                    recipe.flavor_tag === 'Premium'
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-blue-100 text-blue-700 border-blue-300'
                  }
                >
                  {recipe.flavor_tag}
                  {isAdmin && <> +${(recipe.surcharge_per_gram || 0).toFixed(4)}/g</>}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Rinde: {recipe.yield_amount}{recipe.yield_unit}
              </span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(recipe)} title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {onClone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClone(recipe)} title="Duplicar">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(recipe.id)} title="Eliminar">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calculadora de Producción */}
        <div className="bg-muted/40 rounded-lg p-3 border border-border/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Calculadora de Producción</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Mix deseado (g)</Label>
            <Input
              type="number"
              min={1}
              placeholder={`Base: ${totalBaseGrams}g`}
              value={mixDeseado}
              onChange={e => setMixDeseado(e.target.value)}
              className="h-7 text-sm"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Solo visual · no modifica la receta original
          </p>
        </div>

        {/* Tabla de ingredientes */}
        {ingredients.length > 0 ? (
          <div className="divide-y divide-border/70">
            {/* Encabezado */}
            <div className="grid text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2 gap-x-3"
              style={{ gridTemplateColumns: isAdmin
                ? (showCalc ? '1fr auto auto auto auto' : '1fr auto auto auto')
                : (showCalc ? '1fr auto auto auto' : '1fr auto auto') }}>
              <span>Ingrediente</span>
              <span className="text-right">Cant.</span>
              <span className="text-right border-l border-border/70 pl-3">% Receta</span>
              {isAdmin && <span className="text-right border-l border-border/70 pl-3">Costo</span>}
              {showCalc && <span className="text-right text-primary border-l border-primary/30 pl-3">A Pesar (g)</span>}
            </div>

            {ingredients.map((ing, i) => {
              const pct = totalBaseGrams > 0 ? ((ing.quantity || 0) / totalBaseGrams) * 100 : 0;
              const gramsAPesar = showCalc ? (mixValue / totalBaseGrams) * (ing.quantity || 0) : 0;
              const supply = supplies.find(s => s.id === ing.supply_id);
              const ingCost = (supply?.cost_per_unit || 0) * (ing.quantity || 0);
              return (
                <div
                  key={i}
                  className="grid text-sm py-2 gap-x-3 items-center"
                  style={{ gridTemplateColumns: isAdmin
                    ? (showCalc ? '1fr auto auto auto auto' : '1fr auto auto auto')
                    : (showCalc ? '1fr auto auto auto' : '1fr auto auto') }}
                >
                  <span className="text-muted-foreground truncate">{ing.supply_name}</span>
                  <span className="font-mono text-right">{ing.quantity}{ing.unit}</span>
                  <span className="font-mono text-right text-muted-foreground border-l border-border/70 pl-3">{pct.toFixed(2)}%</span>
                  {isAdmin && (
                    <span className="font-mono text-right text-amber-700 border-l border-border/70 pl-3">${ingCost.toFixed(2)}</span>
                  )}
                  {showCalc && (
                    <span className="font-mono text-right text-primary font-bold border-l border-primary/30 pl-3 bg-primary/5 rounded-sm py-0.5">
                      {gramsAPesar.toFixed(1)}g
                    </span>
                  )}
                </div>
              );
            })}

            {/* Footer totales */}
            <div
              className="grid text-xs font-semibold py-2 gap-x-3"
              style={{ gridTemplateColumns: isAdmin
                ? (showCalc ? '1fr auto auto auto auto' : '1fr auto auto auto')
                : (showCalc ? '1fr auto auto auto' : '1fr auto auto') }}
            >
              <span>Total Base</span>
              <span className="font-mono text-right">{totalBaseGrams}g</span>
              <span className="font-mono text-right border-l border-border/70 pl-3">100.00%</span>
              {isAdmin && <span className="font-mono text-right text-amber-700 border-l border-border/70 pl-3">${cost.toFixed(2)}</span>}
              {showCalc && <span className="font-mono text-right text-primary border-l border-primary/30 pl-3 bg-primary/5 rounded-sm py-0.5">{mixValue.toFixed(1)}g</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin ingredientes definidos</p>
        )}

        {isAdmin && (
          <div className="flex justify-between items-center pt-1 border-t">
            <span className="text-xs text-muted-foreground">Costo: ${cost.toFixed(2)}</span>
            <span className="text-sm font-semibold text-primary">Precio: ${recipe.sale_price?.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}