import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { getUnitToppings, pendingIn, toppingNames, allowedToppings } from '@/lib/toppings';

// Completa en Despacho los cupos de toppings incluidos pendientes, unidad por unidad.
export default function ServeToppingsDialog({ order, item, products, isPending, onConfirm, onClose }) {
  const inc = item?.included_toppings_count || 0;
  const units = item ? getUnitToppings(item) : [];
  const [choices, setChoices] = useState([]);
  useEffect(() => { setChoices(units.map(u => Array.from({ length: pendingIn(u, inc) }, () => ''))); }, [item]);
  const options = [
    { value: 'none', label: 'Sin topping' },
    ...allowedToppings(item?.allowed_topping_ids, products).map(t => ({ value: t.id, label: t.name })),
  ];
  const setSlot = (u, s, v) => setChoices(prev => prev.map((c, i) => (i === u ? c.map((x, j) => (j === s ? v : x)) : c)));
  const confirm = () => {
    if (choices.some(c => c.some(x => !x))) return toast.warning('Elige un topping o marca "Sin topping" en cada cupo');
    onConfirm(choices);
  };
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Ticket #{order?.ticket_number || order?.id?.slice(-4)} — Toppings de {item?.product_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{inc} topping(s) incluido(s) por unidad</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-1">
          {units.map((u, ui) => (
            <div key={ui} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-semibold">Unidad {ui + 1}{u.length ? <span className="font-normal text-muted-foreground"> · ya elegido: {toppingNames(u)}</span> : null}</p>
              {(choices[ui] || []).map((v, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Incluido {inc - (choices[ui].length - si) + 1}/{inc}</span>
                  <div className="flex-1 min-w-0">
                    <SearchableCombobox value={v} onChange={(x) => setSlot(ui, si, x)} options={options} keepOrder
                      placeholder="Elegir topping" searchPlaceholder="Buscar topping..." emptyText="Sin toppings" />
                  </div>
                  <Button variant={v === 'none' ? 'default' : 'outline'} size="sm" className="shrink-0" onClick={() => setSlot(ui, si, 'none')}>Sin topping</Button>
                </div>
              ))}
              {(choices[ui] || []).length === 0 && <p className="text-xs text-emerald-700">Completo</p>}
            </div>
          ))}
        </div>
        <DialogFooter className="border-t pt-3 gap-2">
          <Button variant="outline" className="h-12" onClick={onClose}>Cancelar</Button>
          <Button className="h-12 px-6 font-bold" disabled={isPending} onClick={confirm}>{isPending ? 'Descontando...' : 'Confirmar toppings'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}