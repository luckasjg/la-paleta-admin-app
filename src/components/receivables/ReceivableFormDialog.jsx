import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { EUR_PER_USD } from '@/lib/useExchangeRate';

const empty = { customer_id: '', amount: '', balance: '', date: '', status: 'pendiente', notes: '', newName: '', newPhone: '' };

// Crea (histórica) o edita una cuenta por cobrar. Montos en EUR cobrado (1:1 con USD base).
export default function ReceivableFormDialog({ open, onOpenChange, record, staffName, onSaved }) {
  const [f, setF] = useState(empty);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(''); setIsNew(false);
    setF(record ? {
      ...empty, customer_id: record.customer_id, amount: String(+(record.amount_usd * EUR_PER_USD).toFixed(2)),
      balance: String(+(record.balance_usd * EUR_PER_USD).toFixed(2)), date: (record.sale_date || '').slice(0, 10),
      status: record.status, notes: record.notes || '',
    } : { ...empty, date: new Date().toISOString().slice(0, 10) });
  }, [open, record]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers_picker'], enabled: open,
    queryFn: async () => (await base44.entities.Customer.filter({}, { sort: 'full_name', limit: 1000, fields: ['full_name', 'phone'] })).items,
  });

  const save = async () => {
    const amount = Number(f.amount), balance = f.balance === '' ? amount : Number(f.balance);
    if (!(amount > 0) || balance < 0 || balance > amount) return setError('Revisa el monto y el saldo');
    if (isNew ? !(f.newName.trim() && f.newPhone.trim()) : !f.customer_id) return setError('Selecciona o crea el cliente');
    setSaving(true);
    let cust = customers.find(c => c.id === f.customer_id);
    if (isNew) cust = await base44.entities.Customer.create({ full_name: f.newName.trim(), phone: f.newPhone.trim(), is_registered: false });
    const toUsd = (v) => +(v / EUR_PER_USD).toFixed(2);
    const status = balance <= 0.005 ? 'saldada' : f.status;
    const data = {
      customer_id: cust.id, customer_name: cust.full_name, customer_phone: cust.phone,
      amount_usd: toUsd(amount), balance_usd: toUsd(balance), paid_usd: toUsd(amount - balance),
      status, sale_date: new Date(`${f.date}T12:00:00`).toISOString(), notes: f.notes,
      ...(status === 'saldada' && record?.status !== 'saldada' ? { settled_at: new Date().toISOString() } : {}),
    };
    if (record) await base44.entities.AccountReceivable.update(record.id, data);
    else await base44.entities.AccountReceivable.create({ ...data, origin: 'historica', staff_name: staffName });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{record ? 'Editar cuenta' : 'Cargar cuenta histórica'}</DialogTitle></DialogHeader>
        {!record && <p className="text-xs text-muted-foreground -mt-2">No genera venta ni descuenta inventario.</p>}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center"><Label>Cliente</Label>
              <button type="button" className="text-xs text-primary" onClick={() => setIsNew(!isNew)}>{isNew ? 'Elegir existente' : '+ Cliente nuevo'}</button></div>
            {isNew ? (
              <div className="grid grid-cols-2 gap-2"><Input placeholder="Nombre" value={f.newName} onChange={set('newName')} /><Input placeholder="Teléfono" value={f.newPhone} onChange={set('newPhone')} /></div>
            ) : (
              <SearchableCombobox value={f.customer_id} onChange={v => setF({ ...f, customer_id: v })} placeholder="Buscar cliente…"
                options={customers.map(c => ({ value: c.id, label: c.full_name, sublabel: c.phone }))} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Monto fiado (€)</Label><Input type="number" min={0} step="0.01" value={f.amount} onChange={set('amount')} /></div>
            <div className="space-y-1"><Label>Saldo pendiente (€)</Label><Input type="number" min={0} step="0.01" value={f.balance} onChange={set('balance')} placeholder="= monto" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Fecha original</Label><Input type="date" value={f.date} onChange={set('date')} /></div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="saldada">Saldada</SelectItem></SelectContent>
              </Select></div>
          </div>
          <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={set('notes')} /></div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}