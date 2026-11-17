import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import { getStockAt, buildStockDelta, LOCATION_LABEL } from '@/lib/stockHelpers';
import { formatPackages, shortPackages, packageLabel } from '@/lib/packageUnits';

export default function SpentPackageDialog({ open, onOpenChange, utensilios }) {
  const qc = useQueryClient();
  const [location, setLocation] = useState('production');
  const [id, setId] = useState('');
  const [mode, setMode] = useState('package');
  const [packs, setPacks] = useState('1');
  const [perPack, setPerPack] = useState('');
  const [units, setUnits] = useState('');

  const u = utensilios.find(s => s.id === id);
  const savedPer = Number(u?.units_per_package) || 0;
  useEffect(() => { setPerPack(savedPer ? String(savedPer) : ''); setPacks('1'); setUnits(''); }, [id]);

  const avail = u ? getStockAt(u, location) : 0;
  const per = Number(perPack) || 0;
  const total = mode === 'package' ? (Number(packs) || 0) * per : Number(units) || 0;
  const after = avail - total;
  const error = !u ? null : total <= 0 ? 'La cantidad a descontar debe ser mayor que 0'
    : total > avail ? `Supera el stock disponible (${avail} u.)` : null;

  const save = useMutation({
    mutationFn: async () => {
      const detail = mode === 'package'
        ? `${Number(packs)} ${packageLabel(u)} × ${per} unidades (-${total} ${u.unit})`
        : `${total} unidades sueltas (-${total} ${u.unit})`;
      await base44.entities.Supply.update(u.id, {
        ...buildStockDelta(u, location, -total),
        ...(mode === 'package' && !savedPer && per > 0 ? { units_per_package: per } : {}),
      });
      await base44.entities.InventoryAdjustment.create({
        type: 'supply', reference_id: u.id, reference_name: u.name,
        quantity_change: -total, reason: 'paquete_gastado',
        notes: `Salida por paquete gastado: ${detail} · ${LOCATION_LABEL[location]} · stock antes: ${avail}, después: ${after}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      setId(''); onOpenChange(false);
      toast.success('Salida registrada');
    },
    onError: (e) => toast.error(e.message),
  });

  const step = (d) => setPacks(String(Math.max(0, (Number(packs) || 0) + d)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden [&>*]:min-w-0">
        <DialogHeader><DialogTitle>Registrar Paquete Gastado</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2 min-w-0">
          <StockLocationSelector value={location} onChange={setLocation} />
          <div>
            <Label>Utensilio</Label>
            <SearchableCombobox
              value={id}
              onChange={setId}
              placeholder="Seleccionar utensilio..."
              options={utensilios.map(s => ({ value: s.id, label: `${s.name} — ${formatPackages(getStockAt(s, location), s)}` }))}
            />
          </div>
          {u && (
            <>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {[['package', 'Por paquete / caja'], ['unit', 'Por unidades']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setMode(v)}
                    className={`rounded-md py-1.5 text-sm transition-colors ${mode === v ? 'bg-card shadow font-medium' : 'text-muted-foreground'}`}>{l}</button>
                ))}
              </div>
              {mode === 'package' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&>*]:min-w-0">
                  <div>
                    <Label className="text-xs">Paquetes/cajas gastados</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Button type="button" size="icon" variant="outline" onClick={() => step(-1)}><Minus /></Button>
                      <Input type="number" step="0.5" min="0" value={packs} onChange={e => setPacks(e.target.value)} className="text-center min-w-0" />
                      <Button type="button" size="icon" variant="outline" onClick={() => step(1)}><Plus /></Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Unidades por paquete/caja</Label>
                    <Input type="number" min="0" value={perPack} onChange={e => setPerPack(e.target.value)} className="mt-1" placeholder="Ej. 100" />
                    {!savedPer && <p className="text-[11px] text-muted-foreground mt-1">Se guardará para próximas veces</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Cantidad de unidades gastadas</Label>
                  <Input type="number" min="0" value={units} onChange={e => setUnits(e.target.value)} className="mt-1" placeholder="Ej. 50" />
                </div>
              )}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5">
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Total a descontar</span><span className="font-semibold">-{total} {u.unit}</span></div>
                <div className="flex justify-between gap-2"><span className="text-muted-foreground">Stock en {LOCATION_LABEL[location]}</span>
                  <span className="font-medium text-right">{shortPackages(avail, per)} → {shortPackages(after, per)}</span></div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!u || !!error || save.isPending}>
            {save.isPending ? 'Registrando...' : 'Registrar Salida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}