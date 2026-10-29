import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, UserX, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const clean = (v) => (v || '').replace(/\D/g, '');

export default function CustomerIdentifyGate({ onDone }) {
  const [cedula, setCedula] = useState('');
  const [searched, setSearched] = useState(false);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);

  const search = async () => {
    const ced = clean(cedula);
    if (ced.length < 5) return toast.error('Ingresa una cédula válida');
    setBusy(true);
    const found = await base44.entities.Customer.filter({ cedula: { $in: [ced, `V${ced}`, `E${ced}`] } }, '-created_date', 1);
    const c = found[0] || null;
    if (c && c.cedula !== ced) base44.entities.Customer.update(c.id, { cedula: ced }).catch(() => {});
    setExisting(c);
    setForm({ full_name: c?.full_name || '', phone: c?.phone || '', email: c?.email || '' });
    setSearched(true);
    setBusy(false);
  };

  const confirm = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) return toast.error('Nombre y teléfono son obligatorios');
    setBusy(true);
    const ced = clean(cedula);
    const data = { full_name: form.full_name.trim(), phone: form.phone.trim(), email: form.email.trim(), cedula: ced };
    let customer = existing;
    try {
      if (!existing) {
        customer = await base44.entities.Customer.create({ ...data, is_registered: true, category: 'POS' });
      } else if (data.full_name !== existing.full_name || data.phone !== existing.phone || data.email !== (existing.email || '')) {
        customer = await base44.entities.Customer.update(existing.id, data);
      }
    } catch (e) {
      if (!existing) { setBusy(false); return toast.error(e.message); }
      toast.warning('No se pudieron actualizar los datos; se usará el registro existente');
    }
    setBusy(false);
    onDone({ id: customer.id, full_name: customer.full_name, cedula: ced, phone: customer.phone });
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Nueva facturación</h2>
          <p className="text-sm text-muted-foreground">Solicita la cédula del cliente para que acumule puntos.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Cédula *</Label>
          <div className="flex gap-2">
            <Input value={cedula} inputMode="numeric" autoFocus
              onChange={(e) => { setCedula(e.target.value); setSearched(false); }}
              onKeyDown={(e) => e.key === 'Enter' && search()} />
            <Button onClick={search} disabled={busy}>
              {busy && !searched ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {searched && (
          <div className="space-y-3">
            <p className={`text-xs font-medium ${existing ? 'text-emerald-600' : 'text-amber-600'}`}>
              {existing ? 'Cliente encontrado. Confirma sus datos.' : 'Cliente nuevo. Completa sus datos.'}
            </p>
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.full_name} onChange={set('full_name')} /></div>
            <div className="space-y-1.5"><Label>Teléfono *</Label><Input value={form.phone} inputMode="tel" onChange={set('phone')} /></div>
            <div className="space-y-1.5"><Label>Correo (opcional)</Label><Input type="email" value={form.email} onChange={set('email')} /></div>
            <Button className="w-full" onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />} Continuar con cliente
            </Button>
          </div>
        )}
        <button type="button" onClick={() => onDone({ none: true })}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground pt-2 border-t">
          <UserX className="h-4 w-4" /> Continuar sin datos (excepción)
        </button>
      </Card>
    </div>
  );
}