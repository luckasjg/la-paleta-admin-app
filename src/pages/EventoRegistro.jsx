import React, { useState } from 'react';
import { IceCream, Check, Instagram } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Reemplazar por la URL real del perfil de la heladería.
const INSTAGRAM_URL = 'https://www.instagram.com/lapaletacafe';

export default function EventoRegistro() {
  const [f, setF] = useState({ full_name: '', cedula: '', phone: '', instagram: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await base44.functions.invoke('registerEventCustomer', f);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo registrar. Intenta de nuevo.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center"><IceCream className="h-8 w-8" /></div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tu helado te espera</h1>
          <p className="text-muted-foreground">Regístrate y reclama tu helado de regalo en el stand de La Paleta.</p>
        </div>
        {done ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
            <Check className="h-10 w-10 mx-auto text-primary" />
            <p className="font-semibold text-lg">¡Listo, {f.full_name.split(' ')[0]}!</p>
            <p className="text-sm text-muted-foreground">Muestra tu nombre en el stand para recibir tu helado.</p>
            <div className="pt-4 mt-2 border-t space-y-3">
              <p className="text-sm font-medium">Último paso: síguenos en Instagram</p>
              <Button asChild className="w-full">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4" /> Seguir en Instagram</a>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="space-y-1.5"><Label>Nombre</Label><Input required value={f.full_name} onChange={set('full_name')} /></div>
            <div className="space-y-1.5"><Label>Cédula de identidad</Label><Input required inputMode="numeric" placeholder="V12345678" value={f.cedula} onChange={set('cedula')} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input required type="tel" placeholder="0414 1234567" value={f.phone} onChange={set('phone')} /></div>
            <div className="space-y-1.5"><Label>Instagram</Label><Input placeholder="@usuario" value={f.instagram} onChange={set('instagram')} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Registrando…' : 'Quiero mi helado'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}