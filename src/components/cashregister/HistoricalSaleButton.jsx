import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { History } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoricalSaleButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-09-07');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const total = parseFloat(amount);
    if (!(total > 0)) return setError('Ingresa un monto mayor a 0.');
    if (date < '2026-09-01' || date > '2026-09-07') return setError('La fecha debe estar entre el 01/09 y el 07/09/2026.');
    setBusy(true); setError('');
    const existing = await base44.entities.Sale.filter({ payment_method: 'historico', sale_date: { $gte: '2026-09-01', $lte: '2026-09-08' } });
    if (existing.length > 0) { setBusy(false); return setError(`Ya existe una venta histórica de esa semana ($${existing[0].total}).`); }
    await base44.entities.Sale.create({
      total, items: [], payments: [], payment_method: 'historico', status: 'completed',
      sale_date: `${date}T12:00:00`, staff_name: 'Venta histórica (1–7 sep)',
    });
    await qc.invalidateQueries();
    setBusy(false); setOpen(false); setAmount('');
    toast.success('Venta histórica registrada');
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <History className="h-4 w-4 mr-2" /> Venta histórica
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Venta histórica · 1–7 sep 2026</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Se registra como una sola venta marcada como histórica. No afecta inventario ni caja.</p>
          <div className="space-y-3">
            <div><Label>Total vendido (USD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Fecha</Label><Input type="date" min="2026-09-01" max="2026-09-07" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}