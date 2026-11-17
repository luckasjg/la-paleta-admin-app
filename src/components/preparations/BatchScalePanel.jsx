import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

// Controles de escala del lote + confirmación de rendimientos reales.
export default function BatchScalePanel({ prep, batch, setBatch, factor }) {
  const ings = prep.ingredients || [];
  const expectedYield = (prep.yield_amount || 0) * factor;
  const set = (patch) => setBatch(b => ({ ...b, ...patch }));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex gap-2">
          {[['mult', 'Por multiplicador'], ['main', 'Por insumo principal']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set({ mode: v })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${batch.mode === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>{l}</button>
          ))}
        </div>
        {batch.mode === 'mult' ? (
          <div><Label className="text-xs">Multiplicador</Label>
            <Input type="number" step="0.1" min="0" value={batch.mult} onChange={e => set({ mult: e.target.value })} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Insumo principal</Label>
              <SearchableCombobox value={String(batch.mainIdx)} onChange={v => set({ mainIdx: parseInt(v) })} keepOrder
                options={ings.map((i, idx) => ({ value: String(idx), label: i.supply_name }))} /></div>
            <div><Label className="text-xs">Peso real a procesar ({ings[batch.mainIdx]?.unit})</Label>
              <Input type="number" step="0.01" value={batch.mainQty} onChange={e => set({ mainQty: e.target.value })} /></div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Factor de escala: ×{factor.toFixed(3)}</p>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <Label className="text-xs">Peso neto real obtenido (esperado {expectedYield.toFixed(2)} {prep.yield_unit})</Label>
        <Input type="number" step="0.01" value={batch.realYield ?? parseFloat(expectedYield.toFixed(2))} onChange={e => set({ realYield: e.target.value })} />
        {(prep.byproducts || []).map((b, idx) => {
          const exp = (b.expected_yield || 0) * factor;
          return (
            <div key={idx}>
              <Label className="text-xs">{b.supply_name} real (esperado {exp.toFixed(2)} {b.unit})</Label>
              <Input type="number" step="0.01" value={batch.byReal?.[idx] ?? parseFloat(exp.toFixed(2))}
                onChange={e => set({ byReal: { ...batch.byReal, [idx]: e.target.value } })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}