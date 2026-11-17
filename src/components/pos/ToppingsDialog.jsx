import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { normalizeUnit, pendingIn } from '@/lib/toppings';

// Elige los toppings de una unidad en caja: los primeros van incluidos ($0.00), el resto se cobra.
export default function ToppingsDialog({ target, toppings, fmt, onSave, onClose }) {
  const [list, setList] = useState([]);
  useEffect(() => { setList(target ? target.current : []); }, [target]);
  const inc = target?.included || 0;
  const norm = normalizeUnit(list, inc);
  const pending = pendingIn(norm, inc);
  const add = (id) => {
    const p = toppings.find(t => t.id === id);
    if (p) setList(prev => [...prev, { product_id: p.id, product_name: p.name, list_price: p.price || 0 }]);
  };
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Toppings — {target?.name}{target?.qty > 1 ? ` · Unidad ${target.unit + 1}` : ''}</DialogTitle>
          <p className="text-sm text-muted-foreground">{inc} incluido(s) en el precio · los adicionales se cobran a su precio normal</p>
        </DialogHeader>
        <div className="space-y-2">
          {norm.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
              <span className="flex-1 min-w-0 truncate">{t.none ? 'Sin topping' : t.product_name}</span>
              {t.included
                ? <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[11px] font-semibold">Incluido ($0.00)</span>
                : <span className="text-xs font-semibold text-primary">+{fmt(t.price)}</span>}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setList(prev => prev.filter((_, x) => x !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <SearchableCombobox
            value=""
            onChange={add}
            options={toppings.map(t => ({ value: t.id, label: t.name, sublabel: pending > 0 ? 'Incluido' : `+${fmt(t.price || 0)}` }))}
            placeholder={pending > 0 ? `Agregar topping incluido (${inc - pending + 1}/${inc})` : 'Agregar topping extra'}
            searchPlaceholder="Buscar topping..."
            emptyText="Sin toppings"
          />
          {pending > 0 && <p className="text-xs text-muted-foreground">{pending} cupo(s) incluido(s) sin elegir · se pueden completar en Despacho</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(list)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}