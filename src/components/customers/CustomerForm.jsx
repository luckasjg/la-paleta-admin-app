import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const EMPTY = { full_name: '', phone: '', address: '', email: '', credit_limit: 0, notes: '' };

export default function CustomerForm({ open, onOpenChange, customer, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(customer ? { ...EMPTY, ...customer } : EMPTY); setError(''); } }, [open, customer]);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) return setError('Nombre y teléfono son obligatorios');
    setSaving(true);
    try {
      const data = { full_name: form.full_name.trim(), phone: form.phone.trim(), address: form.address, email: form.email, notes: form.notes, credit_limit: Number(form.credit_limit) || 0 };
      if (customer) await base44.entities.Customer.update(customer.id, data);
      else await base44.entities.Customer.create({ ...data, is_registered: true });
      onSaved();
      onOpenChange(false);
    } catch (e) { setError(e.message || 'No se pudo guardar'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{customer ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Nombre *</Label><Input value={form.full_name} onChange={set('full_name')} /></div>
          <div className="space-y-1"><Label>Teléfono *</Label><Input value={form.phone} onChange={set('phone')} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={form.email || ''} onChange={set('email')} /></div>
          <div className="col-span-2 space-y-1"><Label>Dirección</Label><Input value={form.address || ''} onChange={set('address')} /></div>
          <div className="space-y-1"><Label>Límite de crédito (USD, 0 = sin límite)</Label><Input type="number" value={form.credit_limit ?? 0} onChange={set('credit_limit')} /></div>
          <div className="col-span-2 space-y-1"><Label>Notas</Label><Textarea value={form.notes || ''} onChange={set('notes')} rows={2} /></div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}