import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewCustomerForm({ existing = [], onCreated, onCancel }) {
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.full_name.trim() && form.phone.trim();

  const submit = async () => {
    setError('');
    const phone = form.phone.replace(/\D/g, '');
    const dup = existing.find(c => (c.phone || '').replace(/\D/g, '') === phone);
    if (dup) { onCreated(dup, false); return; }
    setSaving(true);
    try {
      const c = await base44.entities.Customer.create({
        full_name: form.full_name.trim(), phone: form.phone.trim(),
        address: form.address.trim(), is_registered: true, credit_limit: 0,
      });
      onCreated(c, true);
    } catch (e) {
      setError(e.message || 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div><Label className="text-xs">Nombre *</Label><Input value={form.full_name} onChange={set('full_name')} autoFocus /></div>
      <div><Label className="text-xs">Teléfono *</Label><Input value={form.phone} onChange={set('phone')} inputMode="tel" /></div>
      <div><Label className="text-xs">Dirección</Label><Input value={form.address} onChange={set('address')} /></div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Volver</Button>
        <Button size="sm" disabled={!valid || saving} onClick={submit}>{saving ? 'Guardando...' : 'Crear cliente'}</Button>
      </div>
    </div>
  );
}