import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import TrayDestinationPicker from '@/components/production/TrayDestinationPicker';
import VariegatosPanel from '@/components/production/VariegatosPanel';

/** Bandeja de salida del lote independiente: destino, variegados propios y peso neto físico. */
export default function IndependentOutputCard({ index, output, lines, activeTrays, supplies, bypass, costPerGram, canRemove, onChange, onRemove }) {
  const set = (patch) => onChange({ ...output, ...patch });
  const addExtra = (id) => {
    const s = supplies.find(x => x.id === id);
    if (s) set({ extras: [...output.extras, { key: `x${Date.now()}`, supply_id: s.id, supply_name: s.name, unit: s.unit }] });
  };
  return (
    <div className="rounded-xl border bg-card p-3 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Bandeja #{index + 1}</p>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        )}
      </div>

      <TrayDestinationPicker tray={{ ...output, recipe_id: 'x' }} activeTrays={activeTrays} onChange={set} />
      {output.mode === 'relleno' && output.target_tray_id && (
        <div>
          <Label className="text-xs">Peso en bandeja antes del relleno (g)</Label>
          <Input type="number" className="h-8" value={output.before} onChange={e => set({ before: parseFloat(e.target.value) || 0 })} />
        </div>
      )}

      {!bypass && (
        <VariegatosPanel
          lines={lines}
          supplies={supplies}
          onChangeQty={(key, qty) => set({ overrides: { ...output.overrides, [key]: qty } })}
          onAddExtra={addExtra}
          onRemoveExtra={(key) => set({ extras: output.extras.filter(e => e.key !== key) })}
        />
      )}

      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-2 space-y-1">
        <Label className="text-xs font-semibold">{output.mode === 'relleno' ? 'Peso neto real añadido (g)' : 'Peso neto real obtenido (g)'}</Label>
        <Input type="number" className="text-base font-semibold" value={output.net || ''} onChange={e => set({ net: parseFloat(e.target.value) || 0 })} />
        <p className="text-[11px] text-muted-foreground">
          Tara descontada.
          {!bypass && output.net > 0 && costPerGram > 0 && ` Costo asignado: $${(output.net * costPerGram).toFixed(2)} ($${costPerGram.toFixed(4)}/g)`}
        </p>
      </div>
    </div>
  );
}