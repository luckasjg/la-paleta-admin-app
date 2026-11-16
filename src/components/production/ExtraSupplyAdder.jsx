import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

/** Agrega un insumo puntual solo a este lote (la receta maestra no cambia). */
export default function ExtraSupplyAdder({ supplies, onAdd }) {
  const [open, setOpen] = useState(false);
  const [supplyId, setSupplyId] = useState('');
  const [qty, setQty] = useState('');

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-xs rounded-none" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" /> Agregar insumo extra al lote
      </Button>
    );
  }
  const add = () => { onAdd(supplyId, parseFloat(qty) || 0); setOpen(false); setSupplyId(''); setQty(''); };
  return (
    <div className="flex items-center gap-2 p-2">
      <div className="flex-1 min-w-0">
        <SearchableCombobox value={supplyId} onChange={setSupplyId}
          options={supplies.map((s) => ({ value: s.id, label: s.name, sublabel: s.unit }))}
          placeholder="Insumo extra" searchPlaceholder="Buscar insumo..." emptyText="Sin resultados" />
      </div>
      <Input type="number" className="h-9 w-20 text-xs text-right" placeholder="Cant." value={qty} onChange={(e) => setQty(e.target.value)} />
      <Button type="button" size="sm" disabled={!supplyId || !(parseFloat(qty) > 0)} onClick={add}>Agregar</Button>
    </div>
  );
}