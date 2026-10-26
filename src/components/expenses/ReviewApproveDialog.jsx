import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { loadRates, RATES_QUERY_KEY } from '@/lib/useExchangeRate';
import { useExpenseCategories } from '@/lib/useExpenseCategories';

const isVuelto = (r) => /vuelto/i.test(`${r.text} ${r.concepto || ''}`);

export default function ReviewApproveDialog({ run, index, onClose }) {
  const qc = useQueryClient();
  const row = run.review_rows[index];
  const { categories } = useExpenseCategories();
  const { data: rates } = useQuery({ queryKey: RATES_QUERY_KEY, queryFn: loadRates });
  const [f, setF] = useState({
    date: row.date || new Date().toISOString().slice(0, 10),
    description: row.concepto || (isVuelto(row) ? 'Vuelto' : ''),
    type: 'variable',
    category: '',
    monto: row.monto ?? '',
    currency: row.is_usd === false ? 'VES' : row.is_usd ? 'EUR' : 'VES',
    tasa: row.tasa || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));

  // Tasa mixta: la de la fila si existe; si no, la vigente de la app
  const rate = Number(f.tasa) > 0 ? Number(f.tasa) : rates?.eurVes || 0;
  const rateSource = Number(f.tasa) > 0 ? 'tasa de la hoja' : 'tasa vigente de la app';
  const monto = Number(f.monto);
  const amount = f.currency === 'VES' ? (rate > 0 ? monto / rate : 0) : monto;
  const cats = categories?.[f.type] || [];
  const valid = f.date && f.description.trim() && f.category && monto > 0 && amount > 0;

  const approve = async () => {
    setSaving(true);
    const trail = f.currency === 'VES' ? `Original: ${monto} Bs | ${rateSource}: ${rate}` : `Original: ${monto} EUR/USD`;
    await base44.entities.Expense.create({
      description: f.description.trim(), amount: Math.round(amount * 100) / 100, category: f.category, type: f.type, date: f.date,
      reported_by: row.responsable || 'Hoja de Google',
      notes: [`Cuenta: ${row.cuenta || '—'}`, 'Aprobado desde revisión', trail, `Hoja: ${row.tab} fila ${row.row}`].join(' | '),
    });
    const review_rows = run.review_rows.map((r, i) => (i === index ? { ...r, approved: true } : r));
    await base44.entities.ExpenseSyncRun.update(run.id, { review_rows });
    qc.invalidateQueries({ queryKey: ['expense_sync_runs'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    toast.success('Gasto aprobado');
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Aprobar fila {row.row} · {row.tab}</DialogTitle></DialogHeader>
        <div className="text-xs bg-secondary/50 rounded-md p-2 break-words">{row.text}<div className="text-amber-700 mt-1">{row.reason}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Concepto</Label><Input value={f.description} onChange={set('description')} /></div>
          <div><Label>Fecha</Label><Input type="date" value={f.date} onChange={set('date')} /></div>
          <div><Label>Tipo</Label>
            <Select value={f.type} onValueChange={(v) => setF((p) => ({ ...p, type: v, category: '' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="variable">Variable</SelectItem><SelectItem value="fijo">Fijo</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Categoría</Label>
            <Select value={f.category} onValueChange={set('category')}>
              <SelectTrigger><SelectValue placeholder="Elegir categoría" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Monto</Label><Input type="number" step="0.01" value={f.monto} onChange={set('monto')} /></div>
          <div><Label>Moneda</Label>
            <Select value={f.currency} onValueChange={set('currency')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="VES">Bs</SelectItem><SelectItem value="EUR">€ / $</SelectItem></SelectContent>
            </Select>
          </div>
          {f.currency === 'VES' && (
            <div className="col-span-2"><Label>Tasa de la hoja (opcional)</Label>
              <Input type="number" step="0.01" value={f.tasa} onChange={set('tasa')} placeholder={`Vigente app: ${rates?.eurVes || '—'}`} />
            </div>
          )}
        </div>
        <div className="text-sm rounded-md border p-2">
          Gasto: <strong>€{amount.toFixed(2)}</strong>
          {f.currency === 'VES' && <span className="text-xs text-muted-foreground"> · {rateSource} {rate}</span>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={approve} disabled={!valid || saving}>{saving ? 'Guardando...' : 'Aprobar gasto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}