import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { traySurchargePerGram } from '@/lib/flavorSurcharge';
import { getUnitFlavors } from '@/lib/unitFlavors';

export default function ServeFlavorsDialog({ order, item, maxFlavors, trays, recipes = [], isPending, onConfirm, onClose }) {
  const qty = item?.quantity || 1;
  const [unit, setUnit] = useState(0);
  const [units, setUnits] = useState([]);
  const selected = units[unit] || [];

  // Precarga los sabores que el cajero anotó para CADA unidad, si siguen en vitrina.
  useEffect(() => {
    setUnit(0);
    if (!item) return setUnits([]);
    setUnits(getUnitFlavors(item).map(u => u.map(f => f.tray_id).filter(id => trays.some(t => t.id === id))));
  }, [item]);

  const setSelected = (fn) => setUnits(prev => { const n = [...prev]; n[unit] = fn(prev[unit] || []); return n; });

  const toggle = (id) => {
    if (selected.includes(id)) return setSelected(prev => prev.filter(x => x !== id));
    if (selected.length >= maxFlavors) return toast.warning(`Este formato admite máximo ${maxFlavors} sabor(es)`);
    setSelected(prev => [...prev, id]);
  };

  const isLast = unit >= qty - 1;
  const full = Array.from({ length: qty }, (_, i) => units[i] || []);
  const missing = full.findIndex(u => u.length === 0);
  const confirm = () => {
    if (missing !== -1) { setUnit(missing); return toast.warning(`Falta elegir los sabores de la unidad ${missing + 1}/${qty}`); }
    onConfirm(full);
  };
  const copyToAll = () => setUnits(Array.from({ length: qty }, () => [...selected]));

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Ticket #{order?.ticket_number || order?.id?.slice(-4)} — {item?.product_name}{qty > 1 ? ` (${unit + 1}/${qty})` : ''}
          </DialogTitle>
          {qty > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {full.map((u, i) => (
                <button key={i} type="button" onClick={() => setUnit(i)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${i === unit ? 'border-primary bg-primary text-primary-foreground' : u.length ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                  {item?.product_name} ({i + 1}/{qty})
                </button>
              ))}
            </div>
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
                {traySurchargePerGram(tray.id, trays, recipes) > 0 && (
                  <span className="mt-1 self-start rounded bg-amber-400 text-amber-950 px-1.5 text-[10px] font-bold uppercase">Premium</span>
                )}
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
          {qty > 1 && (
            <Button variant="secondary" className="h-12" disabled={selected.length === 0 || isPending} onClick={copyToAll}>
              <Copy className="h-4 w-4" /> Copiar a todas
            </Button>
          )}
          <Button
            className="h-12 px-6 text-base font-bold"
            disabled={selected.length === 0 || isPending}
            onClick={() => (isLast ? confirm() : setUnit(u => u + 1))}
          >
            {isPending ? 'Descontando...' : isLast ? 'Confirmar y despachar' : 'Siguiente unidad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}