import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function ServeFlavorsDialog({ order, item, maxFlavors, trays, isPending, onConfirm, onClose }) {
  const qty = item?.quantity || 1;
  const [unit, setUnit] = useState(0);
  const [units, setUnits] = useState([]);
  const selected = units[unit] || [];

  // Precarga los sabores que el cajero ya anotó, si siguen en vitrina.
  useEffect(() => {
    setUnit(0);
    if (!item) return setUnits([]);
    const pre = (item.flavors || []).map(f => f.tray_id).filter(id => trays.some(t => t.id === id));
    setUnits([pre]);
  }, [item]);

  const setSelected = (fn) => setUnits(prev => { const n = [...prev]; n[unit] = fn(prev[unit] || []); return n; });

  const toggle = (id) => {
    if (selected.includes(id)) return setSelected(prev => prev.filter(x => x !== id));
    if (selected.length >= maxFlavors) return toast.warning(`Este formato admite máximo ${maxFlavors} sabor(es)`);
    setSelected(prev => [...prev, id]);
  };

  const isLast = unit >= qty - 1;
  const next = () => { setUnit(u => u + 1); };
  const confirm = (list) => onConfirm(list.slice(0, qty));
  const allSame = () => confirm(Array.from({ length: qty }, (_, i) => (i < unit ? units[i] : selected)));

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Ticket #{order?.ticket_number || order?.id?.slice(-4)} — {item?.product_name}
          </DialogTitle>
          {qty > 1 && (
            <p className="text-base font-semibold text-primary">Sirviendo unidad {unit + 1} de {qty}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Elige hasta <strong>{maxFlavors}</strong> sabor(es) · {selected.length}/{maxFlavors} · {item?.grams}g por unidad
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {trays.map((tray) => {
            const isSelected = selected.includes(tray.id);
            const isLow = (tray.remaining_grams || 0) < 300;
            return (
              <button
                key={tray.id}
                type="button"
                onClick={() => toggle(tray.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all min-h-[80px] flex flex-col justify-between active:scale-95 ${
                  isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary' : 'border-border bg-card hover:bg-secondary/40'
                }`}
              >
                <span className="font-semibold leading-tight line-clamp-2">{tray.recipe_name}</span>
                <span className={`text-xs font-mono mt-1 ${isLow ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {(tray.remaining_grams || 0).toFixed(0)}g
                </span>
              </button>
            );
          })}
          {trays.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No hay bandejas en vitrina</p>}
        </div>
        <DialogFooter className="border-t pt-3 gap-2 flex-wrap">
          <Button variant="outline" className="h-12" onClick={onClose}>Cancelar</Button>
          {unit > 0 && <Button variant="outline" className="h-12" onClick={() => setUnit(u => u - 1)}>Anterior</Button>}
          {!isLast && (
            <Button variant="secondary" className="h-12" disabled={selected.length === 0 || isPending} onClick={allSame}>
              <Copy className="h-4 w-4" /> ¿Todas iguales?
            </Button>
          )}
          <Button
            className="h-12 px-6 text-base font-bold"
            disabled={selected.length === 0 || isPending}
            onClick={() => (isLast ? confirm(units) : next())}
          >
            {isPending ? 'Descontando...' : isLast ? 'Confirmar y despachar' : 'Siguiente unidad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}