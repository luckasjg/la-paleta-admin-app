import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const EMPTY = { title: 'Cupón de bienvenida', benefit: '', description: '', expires_at: '' };

export default function CouponFormDialog({ open, onOpenChange, coupon, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm(coupon ? { title: coupon.title || '', benefit: coupon.benefit || '', description: coupon.description || '', expires_at: coupon.expires_at || '' } : EMPTY);
  }, [open, coupon]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.title.trim() && form.benefit.trim();

  const submit = async () => {
    setSaving(true);
    await onSave({ title: form.title.trim(), benefit: form.benefit.trim(), description: form.description.trim(), expires_at: form.expires_at || null });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{coupon ? 'Editar cupón' : 'Asignar cupón'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nombre</Label><Input value={form.title} onChange={set('title')} /></div>
          <div><Label>Beneficio *</Label><Input value={form.benefit} onChange={set('benefit')} placeholder="Ej. 1 helado pequeño gratis, 10% de descuento…" /></div>
          <div><Label>Condiciones / cómo usarlo</Label><Textarea value={form.description} onChange={set('description')} placeholder="Ej. Válido en tienda, una sola vez" /></div>
          <div><Label>Vence</Label><Input type="date" value={form.expires_at} onChange={set('expires_at')} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || saving} onClick={submit}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}