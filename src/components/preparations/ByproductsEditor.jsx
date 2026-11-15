import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

export default function ByproductsEditor({ byproducts, supplies, onChange }) {
  const allocTotal = byproducts.reduce((s, b) => s + (parseFloat(b.cost_allocation_pct) || 0), 0);

  const update = (idx, field, value) => {
    const next = byproducts.map((b, i) => {
      if (i !== idx) return b;
      if (field === 'supply_id') {
        const s = supplies.find(x => x.id === value);
        return { ...b, supply_id: value, supply_name: s?.name || '', unit: s?.unit || 'g' };
      }
      if (field === 'cost_allocation_pct') {
        const others = allocTotal - (parseFloat(b.cost_allocation_pct) || 0);
        const v = Math.min(Math.max(parseFloat(value) || 0, 0), 100 - others);
        return { ...b, cost_allocation_pct: value === '' ? '' : parseFloat(v.toFixed(2)) };
      }
      return { ...b, [field]: value === '' ? '' : parseFloat(value) || 0 };
    });
    onChange(next);
  };

  const add = () => onChange([...byproducts, { supply_id: '', supply_name: '', expected_yield: 0, unit: 'g', cost_allocation_pct: 0 }]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold">Subproductos reutilizables <span className="font-normal text-muted-foreground text-xs">(opcional)</span></Label>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" />Agregar Subproducto</Button>
      </div>
      {byproducts.length > 0 && (
        <>
          <div className="grid grid-cols-[1fr,90px,72px,32px] gap-2 px-1 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            <span>Insumo</span><span className="text-right">Esperado</span><span className="text-right">% costo</span><span></span>
          </div>
          <div className="space-y-2">
            {byproducts.map((b, idx) => (
              <div key={idx} className="grid grid-cols-[1fr,90px,72px,32px] gap-2 items-center">
                <SearchableCombobox value={b.supply_id} onChange={v => update(idx, 'supply_id', v)}
                  options={supplies.map(s => ({ value: s.id, label: s.name, sublabel: `(${s.unit})` }))}
                  placeholder="Insumo" searchPlaceholder="Buscar insumo..." emptyText="Sin insumos" />
                <div className="relative">
                  <Input type="number" step="0.01" value={b.expected_yield} onChange={e => update(idx, 'expected_yield', e.target.value)} className="text-right pr-7" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{b.unit}</span>
                </div>
                <Input type="number" step="0.1" value={b.cost_allocation_pct} onChange={e => update(idx, 'cost_allocation_pct', e.target.value)} className="text-right" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange(byproducts.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Costo asignado a subproductos: {allocTotal.toFixed(2)}% (máx. 100%) · El preparado principal absorbe {(100 - allocTotal).toFixed(2)}%.</p>
        </>
      )}
    </div>
  );
}