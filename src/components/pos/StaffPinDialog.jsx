import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StaffPinDialog({ staff, onCancel, onValid }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!staff.pin) return setError('Este colaborador no tiene PIN configurado. Pide a un administrador que lo asigne.');
    if (pin !== String(staff.pin)) return setError('PIN incorrecto');
    onValid(staff);
  };
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>PIN de {staff.full_name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-muted-foreground">La cortesía ilimitada requiere que el colaborador ingrese su PIN personal.</p>
          <Input type="password" inputMode="numeric" autoFocus value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }} className="text-center text-lg tracking-widest" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={!pin}>Validar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}