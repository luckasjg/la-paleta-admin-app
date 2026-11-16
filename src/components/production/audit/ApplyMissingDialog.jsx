import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStockAt, LOCATION_LABEL } from '@/lib/stockHelpers';
import { deductWithLog } from '@/lib/deductionLog';

export default function ApplyMissingDialog({ open, onOpenChange, pending, refKey, label, origin = 'helados' }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (open) setRows(pending.map(p => ({ ...p, qty: Number(p.diff.toFixed(2)), location: 'production', include: true })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (i, patch) => setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const apply = useMutation({
    mutationFn: async () => {
      const chosen = rows.filter(r => r.include && r.qty > 0);
      if (!chosen.length) throw new Error('No hay cantidades para descontar.');
      const fresh = await Promise.all(chosen.map(r => base44.entities.Supply.get(r.supply_id).catch(() => null)));
      const errors = chosen.map((r, i) => {
        if (!fresh[i]) return `${r.supply_name}: no existe en inventario`;
        const avail = getStockAt(fresh[i], r.location);
        return avail < r.qty ? `${r.supply_name}: solo hay ${avail.toFixed(1)}${r.unit} en ${LOCATION_LABEL[r.location]}` : null;
      }).filter(Boolean);
      if (errors.length) throw new Error(errors.join(' · '));
      for (const loc of ['production', 'warehouse']) {
        const list = chosen.map((r, i) => ({ supply: fresh[i], qty: r.qty, loc: r.location })).filter(x => x.loc === loc);
        if (list.length) await deductWithLog(list, { location: loc, referenceId: refKey, referenceLabel: label, origin, isCorrection: true });
      }
    },
    onSuccess: () => {
      ['consumption_adjustments', 'supplies', 'consumption_report'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success('Descuento faltante aplicado');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message, { duration: 8000 }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar descuento faltante</DialogTitle>
          <DialogDescription>{label} · confirma cantidad y ubicación de cada insumo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.supply_id} className="grid grid-cols-[auto,1fr] sm:grid-cols-[auto,1fr,110px,150px] gap-2 items-center rounded-lg border p-2">
              <input type="checkbox" checked={r.include} onChange={e => set(i, { include: e.target.checked })} className="h-4 w-4 accent-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.supply_name}</p>
                <p className="text-xs text-muted-foreground font-mono">Falta {r.diff.toFixed(1)}{r.unit}</p>
              </div>
              <div className="relative col-span-2 sm:col-span-1">
                <Input type="number" step="0.1" value={r.qty} onChange={e => set(i, { qty: parseFloat(e.target.value) || 0 })} className="pr-8 text-right" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{r.unit}</span>
              </div>
              <Select value={r.location} onValueChange={v => set(i, { location: v })}>
                <SelectTrigger className="col-span-2 sm:col-span-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Laboratorio</SelectItem>
                  <SelectItem value="warehouse">Almacén</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => apply.mutate()} disabled={apply.isPending}>{apply.isPending ? 'Aplicando...' : 'Aplicar descuento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}