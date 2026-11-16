import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import IngredientRow from '@/components/production/IngredientRow';
import SubstituteDialog from '@/components/production/SubstituteDialog';
import ExtraSupplyAdder from '@/components/production/ExtraSupplyAdder';

/**
 * Paso 1 — Mezcla base del lote: cada ingrediente puede omitirse, ajustarse
 * o sustituirse (simple o compuesta) solo para este lote; también se pueden
 * agregar insumos extra puntuales. La receta maestra no cambia.
 */
export default function IngredientCheckList({
  plan,
  supplies = [],
  sourceLocation,
  realCost,
  onSelectSubstitute,
  onClearSubstitute,
  onTogglePreferred,
  onVariation,
}) {
  const [subRow, setSubRow] = useState(null);
  const missingCount = plan.filter((r) => r.missing).length;
  const nameOf = (id) => supplies.find((s) => s.id === id)?.name || '?';

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
            nameOf={nameOf}
            sourceLocation={sourceLocation}
            onSelectSubstitute={onSelectSubstitute}
            onClearSubstitute={onClearSubstitute}
            onTogglePreferred={onTogglePreferred}
            onVariation={onVariation}
            onOpenSubstitute={setSubRow}
          />
        ))}
        {plan.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">Esta receta no tiene ingredientes base definidos.</p>
        )}
        {plan.length > 0 && (
          <ExtraSupplyAdder supplies={supplies} onAdd={(supplyId, qty) => {
            const s = supplies.find((x) => x.id === supplyId);
            onVariation(`x${Date.now()}`, { status: 'extra', supply_id: supplyId, supply_name: s?.name, actual_quantity: qty, reason: 'Insumo extra del lote' });
          }} />
        )}
      </div>

      {subRow && (
        <SubstituteDialog
          row={subRow}
          supplies={supplies}
          onClose={() => setSubRow(null)}
          onClear={() => { onVariation(subRow.index, null); setSubRow(null); }}
          onConfirm={(targets, factors) => {
            onVariation(subRow.index, {
              status: 'substituted', actual_quantity: 0, targets, ...(factors ? { factors } : {}),
              reason: `Sustituido por: ${targets.map((t) => `+${t.quantity}${subRow.unit} ${nameOf(t.supply_id)}`).join(', ')}`,
            });
            setSubRow(null);
          }}
        />
      )}
    </div>
  );
}