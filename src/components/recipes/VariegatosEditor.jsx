import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

/** Variegados / Inclusiones Post-Mantecado de la receta. */
export default function VariegatosEditor({ value = [], onChange, supplies }) {
  const options = supplies
    .filter((s) => s.sector === 'materia_prima')
    .map((s) => ({ value: s.id, label: s.name, sublabel: `(${s.unit})` }));

  const update = (idx, patch) => onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const pick = (idx, id) => {
    const s = supplies.find((x) => x.id === id);
    update(idx, { supply_id: id, supply_name: s?.name || '', unit: s?.unit || 'g' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold">Variegados / Inclusiones Post-Mantecado</Label>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, { supply_id: '', supply_name: '', quantity: 0, unit: 'g' }])}>
          <Plus className="h-3 w-3 mr-1" />Agregar
        </Button>
      </div>
      <div className="space-y-2">
        {value.map((v, idx) => (
          <div key={idx} className="grid grid-cols-[1fr,110px,32px] gap-2 items-center">
            <SearchableCombobox
              value={v.supply_id}
              onChange={(id) => pick(idx, id)}
              options={options}
              placeholder="Insumo"
              searchPlaceholder="Buscar insumo..."
              emptyText="Sin insumos"
            />
            <div className="relative">
              <Input
                type="number" step="0.01" className="text-right pr-7"
                value={v.quantity || ''}
                onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 0 })}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{v.unit}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(value.filter((_, i) => i !== idx))}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        {value.length === 0 && (
          <p className="text-xs text-muted-foreground">Siropes, pastas para vetear, galletas o trozos que se añaden al armar la bandeja.</p>
        )}
      </div>
    </div>
  );
}