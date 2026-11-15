import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import IngredientRow from '@/components/production/IngredientRow';

/**
 * Paso 1 — Mezcla base del lote: cada ingrediente puede omitirse, ajustarse
 * o sustituirse solo para este lote (la receta maestra no cambia).
 */
export default function IngredientCheckList({
  plan,
  sourceLocation,
  realCost,
  onSelectSubstitute,
  onClearSubstitute,
  onTogglePreferred,
  onVariation,
}) {
  const missingCount = plan.filter((r) => r.missing).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className={`px-3 py-2 flex items-center justify-between gap-2 text-sm font-medium ${
        missingCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'
      }`}>
        <span className="flex items-center gap-2">
          {missingCount > 0
            ? <><AlertTriangle className="h-4 w-4" /> Mezcla base · faltan {missingCount}</>
            : <><CheckCircle2 className="h-4 w-4" /> Mezcla base · inventario suficiente</>}
        </span>
        {plan.length > 0 && <span className="text-xs font-mono opacity-80">Costo base: ${realCost.toFixed(2)}</span>}
      </div>

      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {plan.map((row) => (
          <IngredientRow
            key={row.index}
            row={row}
            sourceLocation={sourceLocation}
            onSelectSubstitute={onSelectSubstitute}
            onClearSubstitute={onClearSubstitute}
            onTogglePreferred={onTogglePreferred}
            onVariation={onVariation}
          />
        ))}
        {plan.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">Esta receta no tiene ingredientes base definidos.</p>
        )}
      </div>
    </div>
  );
}