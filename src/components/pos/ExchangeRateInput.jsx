import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Lock } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export default function ExchangeRateInput({ rate, setRate, requireConfirm = false }) {
  const [local, setLocal] = useState(String(rate));
  const [pendingValue, setPendingValue] = useState(null);

  useEffect(() => { setLocal(String(rate)); }, [rate]);

  const tryCommit = () => {
    const n = parseFloat(local);
    if (!n || n <= 0) { setLocal(String(rate)); return; }
    if (n === rate) return;
    if (requireConfirm) {
      // Ask the cashier to confirm changing the rate mid-sale
      setPendingValue(n);
    } else {
      setRate(n);
    }
  };

  const confirmChange = () => {
    if (pendingValue != null) setRate(pendingValue);
    setPendingValue(null);
  };

  const cancelChange = () => {
    setPendingValue(null);
    setLocal(String(rate));
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
        {requireConfirm
          ? <Lock className="h-4 w-4 text-amber-500" />
          : <DollarSign className="h-4 w-4 text-primary" />}
        <Label className="text-xs text-muted-foreground whitespace-nowrap">1 USD =</Label>
        <Input
          type="number" step="0.01" min="0"
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={tryCommit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="h-7 w-20 text-sm font-mono px-2"
        />
        <span className="text-xs font-medium text-muted-foreground">Bs.</span>
      </div>

      <AlertDialog open={pendingValue != null} onOpenChange={(o) => { if (!o) cancelChange(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Modificar la tasa de cambio?</AlertDialogTitle>
            <AlertDialogDescription>
              Hay un cobro en curso. Cambiar la tasa ahora puede afectar futuros cobros, pero
              la venta actualmente abierta mantendrá su tasa fija (<span className="font-mono">Bs. {rate.toFixed(2)}</span>).
              <br /><br />
              Nueva tasa: <span className="font-mono font-semibold">1 USD = Bs. {pendingValue?.toFixed(2)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Sí, actualizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}