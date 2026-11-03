import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ServeFlavorsDialog({ order, item, maxFlavors, trays, isPending, onConfirm, onClose }) {
  const [selected, setSelected] = useState([]);

  // Precarga los sabores que el cajero ya anotó, si siguen en vitrina.
  useEffect(() => {
    if (!item) return setSelected([]);
    setSelected((item.flavors || []).map(f => f.tray_id).filter(id => trays.some(t => t.id === id)));
  }, [item]);

  const toggle = (id) => {
    if (selected.includes(id)) return setSelected(prev => prev.filter(x => x !== id));
    if (selected.length >= maxFlavors) return toast.warning(`Este formato admite máximo ${maxFlavors} sabor(es)`);
    setSelected(prev => [...prev, id]);
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Ticket #{order?.ticket_number || order?.id?.slice(-4)} — {item?.quantity}x {item?.product_name}
          </DialogTitle>
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
        <DialogFooter className="border-t pt-3 gap-2">
          <Button variant="outline" className="h-12" onClick={onClose}>Cancelar</Button>
          <Button
            className="h-12 px-6 text-base font-bold"
            disabled={selected.length === 0 || isPending}
            onClick={() => onConfirm(selected)}
          >
            {isPending ? 'Descontando...' : `Confirmar despacho (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}