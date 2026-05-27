import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, SlidersHorizontal, Pencil } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import { buildStockDelta, getStockAt, LOCATION_LABEL } from '@/lib/stockHelpers';

const REASONS = [
  { value: 'derrame', label: 'Derrame' },
  { value: 'producto_dañado', label: 'Producto Dañado' },
  { value: 'conteo_fisico', label: 'Conteo Físico' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
];

export default function Adjustments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustType, setAdjustType] = useState('supply');
  const [refId, setRefId] = useState('');
  const [qtyChange, setQtyChange] = useState(0);
  const [reason, setReason] = useState('conteo_fisico');
  const [adjNotes, setAdjNotes] = useState('');
  // Origen de Materia Prima: solo aplica a ajustes tipo 'supply'.
  const [sourceLocation, setSourceLocation] = useState('production');

  // Edit state
  const [editAdj, setEditAdj] = useState(null); // adjustment being edited
  const [editQty, setEditQty] = useState(0);
  const [editReason, setEditReason] = useState('conteo_fisico');
  const [editNotes, setEditNotes] = useState('');

  const qc = useQueryClient();

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

  const createAdj = useMutation({
    mutationFn: async () => {
      if (!refId || qtyChange === 0) return;

      let refName = '';
      if (adjustType === 'supply') {
        const supply = supplies.find(s => s.id === refId);
        if (supply) {
          refName = supply.name;
          // Si es negativo, no permitimos dejar la ubicación bajo cero.
          let effectiveDelta = qtyChange;
          if (qtyChange < 0) {
            const avail = getStockAt(supply, sourceLocation);
            effectiveDelta = -Math.min(avail, -qtyChange);
          }
          await base44.entities.Supply.update(
            supply.id,
            buildStockDelta(supply, sourceLocation, effectiveDelta)
          );
        }
      } else {
        const tray = trays.find(t => t.id === refId);
        if (tray) {
          refName = tray.recipe_name;
          const newGrams = Math.max(0, (tray.remaining_grams || 0) + qtyChange);
          await base44.entities.Tray.update(tray.id, {
            remaining_grams: newGrams,
            status: newGrams <= 0 ? 'agotada' : 'activa',
          });
        }
      }

      await base44.entities.InventoryAdjustment.create({
        type: adjustType,
        reference_id: refId,
        reference_name: refName,
        quantity_change: qtyChange,
        reason,
        notes: adjustType === 'supply'
          ? `[${LOCATION_LABEL[sourceLocation]}] ${adjNotes || ''}`.trim()
          : adjNotes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['trays'] });
      setDialogOpen(false);
      setRefId('');
      setQtyChange(0);
      setAdjNotes('');
      toast.success('Ajuste aplicado');
    },
  });

  const openEdit = (adj) => {
    setEditAdj(adj);
    setEditQty(adj.quantity_change);
    setEditReason(adj.reason);
    setEditNotes(adj.notes || '');
  };

  const editMut = useMutation({
    mutationFn: async () => {
      const oldQty = editAdj.quantity_change;
      const newQty = editQty;
      const diff = newQty - oldQty; // net change to apply to stock

      if (diff !== 0) {
        if (editAdj.type === 'supply') {
          const supply = supplies.find(s => s.id === editAdj.reference_id);
          if (supply) {
            // Detectar la ubicación original a partir del prefijo en las notas; default = production.
            const prefix = (editAdj.notes || '').match(/^\[([^\]]+)\]/);
            const origLoc = prefix && /almac/i.test(prefix[1]) ? 'warehouse' : 'production';
            let effectiveDelta = diff;
            if (diff < 0) {
              const avail = getStockAt(supply, origLoc);
              effectiveDelta = -Math.min(avail, -diff);
            }
            await base44.entities.Supply.update(
              supply.id,
              buildStockDelta(supply, origLoc, effectiveDelta)
            );
          }
        } else {
          const tray = trays.find(t => t.id === editAdj.reference_id);
          if (tray) {
            const newGrams = Math.max(0, (tray.remaining_grams || 0) + diff);
            await base44.entities.Tray.update(tray.id, {
              remaining_grams: newGrams,
              status: newGrams <= 0 ? 'agotada' : 'activa',
            });
          }
        }
      }

      await base44.entities.InventoryAdjustment.update(editAdj.id, {
        quantity_change: newQty,
        reason: editReason,
        notes: editNotes,
        is_edited: true,
        original_quantity_change: editAdj.is_edited
          ? editAdj.original_quantity_change
          : oldQty,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['trays'] });
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
                  <TableCell colSpan={6} className="text-center py-8">
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
                    <TableCell><Badge variant="secondary">{REASONS.find(r => r.value === a.reason)?.label || a.reason}</Badge></TableCell>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={adjustType} onValueChange={v => { setAdjustType(v); setRefId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supply">Insumo</SelectItem>
                  <SelectItem value="tray">Bandeja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {adjustType === 'supply' && (
              <StockLocationSelector value={sourceLocation} onChange={setSourceLocation} label="Ubicación a Ajustar" />
            )}
            <div>
              <Label>{adjustType === 'supply' ? 'Insumo' : 'Bandeja'}</Label>
              <Select value={refId} onValueChange={setRefId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {adjustType === 'supply'
                    ? supplies.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {LOCATION_LABEL[sourceLocation]}: {getStockAt(s, sourceLocation)} {s.unit}
                        </SelectItem>
                      ))
                    : trays.map(t => <SelectItem key={t.id} value={t.id}>{t.recipe_name} ({t.remaining_grams?.toFixed(0)}g)</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cambio de Cantidad (+ agregar, - restar)</Label>
              <Input type="number" value={qtyChange} onChange={e => setQtyChange(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Detalles del ajuste..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAdj.mutate()} disabled={!refId || qtyChange === 0 || createAdj.isPending}>
              {createAdj.isPending ? 'Aplicando...' : 'Aplicar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={!!editAdj} onOpenChange={() => setEditAdj(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Ajuste — {editAdj?.reference_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              Valor original: <span className="font-mono font-semibold text-foreground">
                {editAdj?.original_quantity_change !== undefined && editAdj?.is_edited
                  ? (editAdj.original_quantity_change > 0 ? '+' : '') + editAdj.original_quantity_change
                  : (editAdj?.quantity_change > 0 ? '+' : '') + editAdj?.quantity_change}
              </span>
              <br />
              La diferencia se aplicará automáticamente al stock.
            </div>
            <div>
              <Label>Nueva Cantidad (+ agregar, - restar)</Label>
              <Input
                type="number"
                value={editQty}
                onChange={e => setEditQty(parseFloat(e.target.value) || 0)}
              />
              {editAdj && editQty !== editAdj.quantity_change && (
                <p className="text-xs text-amber-600 mt-1">
                  Diferencia neta a aplicar al stock: {editQty - editAdj.quantity_change > 0 ? '+' : ''}{(editQty - editAdj.quantity_change).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={editReason} onValueChange={setEditReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Detalles del ajuste..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdj(null)}>Cancelar</Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>
              {editMut.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}