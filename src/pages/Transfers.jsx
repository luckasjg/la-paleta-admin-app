import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { getStockAt, buildTransferDelta, LOCATION_LABEL } from '@/lib/stockHelpers';
import TransferHistory from '@/components/transfers/TransferHistory';

export default function Transfers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplyId, setSupplyId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [fromLocation, setFromLocation] = useState('warehouse');
  const [toLocation, setToLocation] = useState('production');
  const [notes, setNotes] = useState('');
  const qc = useQueryClient();

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['inventory_transfers'],
    queryFn: () => base44.entities.InventoryTransfer.list('-created_date', 50),
  });

  // Solo insumos físicos (materia prima, utensilios) — excluimos infinitos
  const supplyOptions = useMemo(
    () =>
      supplies
        .filter((s) => !s.is_infinite)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
        .map((s) => ({
          value: s.id,
          label: s.name,
          sublabel: `· Almacén ${getStockAt(s, 'warehouse')}${s.unit} · Producción ${getStockAt(s, 'production')}${s.unit}`,
        })),
    [supplies]
  );

  const selectedSupply = supplies.find((s) => s.id === supplyId);
  const available = selectedSupply ? getStockAt(selectedSupply, fromLocation) : 0;
  const insufficient = quantity > 0 && quantity > available;
  const sameLocation = fromLocation === toLocation;
  const canSubmit = supplyId && quantity > 0 && !insufficient && !sameLocation;

  const close = () => {
    setDialogOpen(false);
    setSupplyId('');
    setQuantity(0);
    setFromLocation('warehouse');
    setToLocation('production');
    setNotes('');
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedSupply) throw new Error('Insumo no encontrado');
      const qty = parseFloat(quantity);

      const payload = buildTransferDelta(selectedSupply, fromLocation, toLocation, qty);
      await base44.entities.Supply.update(selectedSupply.id, payload);

      await base44.entities.InventoryTransfer.create({
        supply_id: selectedSupply.id,
        supply_name: selectedSupply.name,
        quantity: qty,
        unit: selectedSupply.unit,
        from_location: fromLocation,
        to_location: toLocation,
        notes,
        transfer_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['inventory_transfers'] });
      toast.success('Transferencia registrada');
      close();
    },
    onError: (e) => toast.error(e.message || 'Error al transferir'),
  });

  const swapLocations = () => {
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transferencias de Inventario"
        description="Mueve mercancía entre el Almacén Principal y el Laboratorio de Producción"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Transferencia
          </Button>
        }
      />

      <TransferHistory transfers={transfers} />

      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Transferencia Interna</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Insumo</Label>
              <SearchableCombobox
                value={supplyId}
                onChange={setSupplyId}
                options={supplyOptions}
                placeholder="Seleccionar insumo..."
                searchPlaceholder="Buscar insumo..."
                emptyText="Sin insumos"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div>
                <Label className="text-xs">Origen</Label>
                <div className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm font-medium">
                  {LOCATION_LABEL[fromLocation]}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={swapLocations}
                title="Invertir dirección"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div>
                <Label className="text-xs">Destino</Label>
                <div className="rounded-md border border-input bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  {LOCATION_LABEL[toLocation]}
                </div>
              </div>
            </div>

            {selectedSupply && (
              <div className="rounded-lg border bg-muted/40 p-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disponible en {LOCATION_LABEL[fromLocation]}:</span>
                  <span className="font-mono font-semibold">
                    {available} {selectedSupply.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">En {LOCATION_LABEL[toLocation]}:</span>
                  <span className="font-mono">
                    {getStockAt(selectedSupply, toLocation)} {selectedSupply.unit}
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label>Cantidad a mover ({selectedSupply?.unit || 'unidad'})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
              {insufficient && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> La cantidad excede el stock disponible en el origen.
                </p>
              )}
              {sameLocation && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Origen y destino no pueden ser iguales.
                </p>
              )}
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo o referencia..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!canSubmit || createMut.isPending}>
              {createMut.isPending ? 'Transfiriendo...' : 'Confirmar Transferencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}