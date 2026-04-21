import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Thermometer, TrendingUp } from 'lucide-react';

const TYPE_LABELS = { helado: 'Helado', cafe: 'Café', merengada: 'Merengada', otro: 'Otro' };

export default function RecipeCard({ recipe: r, supplies, onEdit, onDelete }) {
  const totalGrams = (r.ingredients || []).reduce((s, i) => s + (i.quantity || 0), 0);
  const totalCalories = (r.ingredients || []).reduce((s, i) => s + (i.calories || 0), 0);
  const totalSugars = (r.ingredients || []).reduce((s, i) => s + (i.sugars || 0), 0);
  const totalFats = (r.ingredients || []).reduce((s, i) => s + (i.fats || 0), 0);

  const cost = (r.ingredients || []).reduce((sum, ing) => {
    const supply = supplies.find(s => s.id === ing.supply_id);
    return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
  }, 0);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {r.recipe_number && (
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">#{r.recipe_number}</span>
              )}
              <CardTitle className="text-base truncate">{r.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">{TYPE_LABELS[r.type] || r.type}</Badge>
              {r.yield_amount && <span className="text-xs text-muted-foreground">Mix: {r.yield_amount}g</span>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Technical params for ice cream */}
        {r.type === 'helado' && (
          <div className="flex gap-3 mb-3 text-xs">
            {r.overrun != null && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Overrun: <strong className="text-foreground">{r.overrun}%</strong></span>
              </div>
            )}
            {r.service_temperature != null && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Thermometer className="h-3 w-3" />
                <span>Servicio: <strong className="text-foreground">{r.service_temperature}°C</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Ingredient summary */}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {(r.ingredients || []).slice(0, 6).map((ing, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">{ing.supply_name}</span>
              <span className="font-mono ml-2 flex-shrink-0">{ing.quantity}g</span>
            </div>
          ))}
          {(r.ingredients || []).length > 6 && (
            <p className="text-xs text-muted-foreground">+{r.ingredients.length - 6} más...</p>
          )}
        </div>

        {/* Totals */}
        {(r.ingredients || []).length > 0 && (
          <div className="mt-3 pt-2 border-t grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Total mix:</span><span className="font-mono font-semibold">{totalGrams}g</span></div>
            {totalCalories > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Calorías:</span><span className="font-mono">{Math.round(totalCalories)}</span></div>}
            {totalSugars > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Azúcares:</span><span className="font-mono">{Math.round(totalSugars)}g</span></div>}
            {totalFats > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Grasas:</span><span className="font-mono">{Math.round(totalFats)}g</span></div>}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Costo: ${cost.toFixed(2)}</span>
          {r.sale_price > 0 && <span className="text-sm font-semibold text-primary">${r.sale_price.toFixed(2)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}