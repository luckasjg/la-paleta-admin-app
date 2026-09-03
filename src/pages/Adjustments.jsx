import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, SlidersHorizontal, Pencil } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';
import { buildStockDelta, getStockAt, LOCATION_LABEL } from '@/lib/stockHelpers';
import AdjustmentDialog from '@/components/adjustments/AdjustmentDialog';
import { useAdjustmentReasons, reasonLabel } from '@/lib/useAdjustmentReasons';

export default function Adjustments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAdj, setEditAdj] = useState(null);

  const qc = useQueryClient();
  const { reasons } = useAdjustmentReasons();

  const { data: adjustments = [] } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => base44.entities.InventoryAdjustment.list('-created_date', 50),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.filter({ status: 'activa' }),
  });

  // Aplica el delta al stock (insumo en su ubicación, o bandeja).
  const applyStockDelta = async ({ type, refId, location, stockDelta }) => {
    if (stockDelta === 0) return;
    if (type === 'supply') {
      const supply = supplies.find(s => s.id === refId);
      if (!supply) return;
      let effectiveDelta = stockDelta;
      if (stockDelta < 0) {
        const avail = getStockAt(supply, location);
        effectiveDelta = -Math.min(avail, -stockDelta);
      }
      await base44.entities.Supply.update(supply.id, buildStockDelta(supply, location, effectiveDelta));
    } else {
      const tray = trays.find(t => t.id === refId);
      if (!tray) return;
      const newGrams = Math.max(0, (tray.remaining_grams || 0) + stockDelta);
      await base44.entities.Tray.update(tray.id, {
        remaining_grams: newGrams,
        status: newGrams <= 0 ? 'agotada' : 'activa',
      });
    }
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['adjustments'] });
    qc.invalidateQueries({ queryKey: ['supplies'] });
    qc.invalidateQueries({ queryKey: ['trays'] });
  };

  const createAdj = useMutation({
    mutationFn: async (payload) => {
      await applyStockDelta(payload);
      await base44.entities.InventoryAdjustment.create({
        type: payload.type,
        reference_id: payload.refId,
        reference_name: payload.refName,
        quantity_change: payload.storedQty,
        reason: payload.reason,
        notes: payload.type === 'supply'
          ? `[${LOCATION_LABEL[payload.location]}] ${payload.notes || ''}`.trim()
          : payload.notes,
      });
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success('Ajuste aplicado');
    },
    onError: (err) => toast.error(err.message),
  });

  const editMut = useMutation({
    mutationFn: async (payload) => {
      await applyStockDelta(payload);
      await base44.entities.InventoryAdjustment.update(editAdj.id, {
        quantity_change: payload.storedQty,
        reason: payload.reason,
        notes: payload.notes,
        is_edited: true,
        original_quantity_change: editAdj.is_edited
          ? editAdj.original_quantity_change
          : editAdj.quantity_change,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditAdj(null);
      toast.success('Ajuste actualizado y stock recalculado');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes de Inventario"
        description="Correcciones manuales de stock"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Ajuste
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Historial de Ajustes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Cambio</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">Sin ajustes registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                adjustments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      <div>{moment(a.created_date).format('DD/MM/YY HH:mm')}</div>
                      {a.is_edited && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs mt-0.5">Editado</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{a.type === 'supply' ? 'Insumo' : 'Bandeja'}</Badge></TableCell>
                    <TableCell className="font-medium">{a.reference_name}</TableCell>
                    <TableCell><Badge variant="secondary">{reasonLabel(a.reason, reasons)}</Badge></TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${a.quantity_change > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {a.quantity_change > 0 ? '+' : ''}{a.quantity_change}
                      {a.is_edited && a.original_quantity_change !== undefined && (
                        <div className="text-xs text-muted-foreground font-normal line-through">
                          {a.original_quantity_change > 0 ? '+' : ''}{a.original_quantity_change}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{a.notes || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditAdj(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdjustmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={null}
        supplies={supplies}
        trays={trays}
        onSubmit={(payload) => createAdj.mutate(payload)}
        isPending={createAdj.isPending}
      />

      <AdjustmentDialog
        open={!!editAdj}
        onOpenChange={(v) => { if (!v) setEditAdj(null); }}
        editing={editAdj}
        supplies={supplies}
        trays={trays}
        onSubmit={(payload) => editMut.mutate(payload)}
        isPending={editMut.isPending}
      />
    </div>
  );
}