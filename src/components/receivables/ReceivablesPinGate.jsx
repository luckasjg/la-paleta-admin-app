import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock } from 'lucide-react';

export default function ReceivablesPinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    const { items } = await base44.entities.StaffPOS.filter(
      { pin_receivables: pin, can_manage_receivables: true, is_active: { $ne: false } },
      { limit: 1, fields: ['full_name'] }
    );
    setChecking(false);
    if (items[0]) onUnlock(items[0]);
    else { setError('PIN incorrecto o sin acceso a cobranza'); setPin(''); }
  };

  return (
    <Card className="p-6 max-w-sm mx-auto text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><Lock className="h-5 w-5 text-primary" /></div>
      <div><p className="font-semibold">Gestión de cuentas</p><p className="text-xs text-muted-foreground">Ingresa tu PIN de cobranza para cargar o editar cuentas</p></div>
      <form onSubmit={submit} className="space-y-3">
        <Input type="password" inputMode="numeric" autoFocus value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} maxLength={6} className="text-center tracking-[0.5em] text-lg" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pin.length < 4 || checking}>{checking ? 'Verificando…' : 'Entrar'}</Button>
      </form>
    </Card>
  );
}