import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

const MODES = [
  { value: 'independiente', label: 'Receta Independiente' },
  { value: 'base', label: 'Base Maestra' },
  { value: 'derivado', label: 'Sabor Derivado' },
];

export default function FormulationSelector({ form, setForm, bases }) {
  const mode = form.is_master_base ? 'base' : (form._mode === 'derivado' || form.base_recipe_id) ? 'derivado' : 'independiente';
  const setMode = (m) => setForm(f => ({
    ...f,
    _mode: m,
    is_master_base: m === 'base',
    base_recipe_id: m === 'derivado' ? f.base_recipe_id || '' : '',
    base_quantity_grams: m === 'derivado' ? f.base_quantity_grams || 0 : 0,
  }));

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-3">
      <Label className="text-xs">Tipo de formulación</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map(m => (
          <button key={m.value} type="button" onClick={() => setMode(m.value)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${mode === m.value ? 'bg-violet-600 text-white border-violet-600' : 'bg-background hover:bg-muted'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'base' && (
        <p className="text-[11px] text-muted-foreground">Fórmula estructural: no se vende como sabor final. Define sus ingredientes y su rendimiento base.</p>
      )}
      {mode === 'derivado' && (
        <div className="grid grid-cols-[1fr,130px] gap-2">
          <div>
            <Label className="text-xs">Base Maestra</Label>
            <SearchableCombobox value={form.base_recipe_id || ''} onChange={v => setForm(f => ({ ...f, base_recipe_id: v }))}
              options={bases.map(b => ({ value: b.id, label: b.name }))} placeholder="Elegir base" searchPlaceholder="Buscar base..." emptyText="No hay bases maestras" />
          </div>
          <div>
            <Label className="text-xs">Gramos de base / bandeja</Label>
            <Input type="number" step="1" value={form.base_quantity_grams || ''} onChange={e => setForm(f => ({ ...f, base_quantity_grams: parseFloat(e.target.value) || 0 }))} />
          </div>
          <p className="col-span-2 text-[11px] text-muted-foreground">Abajo agrega solo los saborizantes y variegados propios de este sabor.</p>
        </div>
      )}
    </div>
  );
}