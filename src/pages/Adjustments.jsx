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
import { Plus, SlidersHorizontal } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';

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
          await base44.entities.Supply.update(supply.id, {
            stock_current: Math.max(0, (supply.stock_current || 0) + qtyChange),
          });
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
        notes: adjNotes,
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
                    <TableCell className="text-sm">{moment(a.created_date).format('DD/MM/YY HH:mm')}</TableCell>
                    <TableCell><Badge variant="secondary">{a.type === 'supply' ? 'Insumo' : 'Bandeja'}</Badge></TableCell>
                    <TableCell className="font-medium">{a.reference_name}</TableCell>
                    <TableCell><Badge variant="secondary">{REASONS.find(r => r.value === a.reason)?.label || a.reason}</Badge></TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${a.quantity_change > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {a.quantity_change > 0 ? '+' : ''}{a.quantity_change}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{a.notes || '—'}</TableCell>
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
            <div>
              <Label>{adjustType === 'supply' ? 'Insumo' : 'Bandeja'}</Label>
              <Select value={refId} onValueChange={setRefId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {adjustType === 'supply'
                    ? supplies.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.stock_current} {s.unit})</SelectItem>)
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
    </div>
  );
}