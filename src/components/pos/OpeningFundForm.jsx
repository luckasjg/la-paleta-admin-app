import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

/** Paso 2 de la apertura: el cajero declara el fondo de caja con que inicia. */
export default function OpeningFundForm({ staffName, submitting, onBack, onConfirm, initialUsd, initialVes, confirmLabel = 'Abrir caja', backLabel = 'Atrás' }) {
  const [usd, setUsd] = useState(initialUsd ? String(initialUsd) : '');
  const [ves, setVes] = useState(initialVes ? String(initialVes) : '');

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm">Hola, <strong>{staffName}</strong></p>
        <p className="text-xs text-muted-foreground">¿Con cuánto efectivo inicias la caja?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Fondo en divisas (€/$)</Label>
          <Input type="number" min="0" step="0.01" placeholder="0.00" value={usd}
            onChange={e => setUsd(e.target.value)} className="font-mono h-11" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Fondo en bolívares</Label>
          <Input type="number" min="0" step="0.01" placeholder="0.00" value={ves}
            onChange={e => setVes(e.target.value)} className="font-mono h-11" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Sólo se usa para cuadrar el efectivo al cerrar. Puedes dejarlo en 0.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={submitting}>{backLabel}</Button>
        <Button className="flex-1 h-11" disabled={submitting}
          onClick={() => onConfirm({
            opening_cash_usd: Math.max(0, parseFloat(usd) || 0),
            opening_cash_ves: Math.max(0, parseFloat(ves) || 0),
          })}>
          <Wallet className="h-4 w-4" /> {submitting ? 'Guardando…' : confirmLabel}
        </Button>
      </div>
    </div>
  );
}