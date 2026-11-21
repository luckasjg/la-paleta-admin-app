import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { LEFTOVER_DESTINATIONS } from '@/lib/independentBatch';

const g = (n) => `${Math.round(n || 0).toLocaleString('es')} g`;

/** Rendimiento y sobrante del lote: balance físico teórico vs. útil + sobrante. */
export default function YieldBalancePanel({ balance, leftover, destination, onLeftover, onDestination }) {
  const negative = balance.loss < -0.5;
  const rows = [
    ['Peso teórico esperado', g(balance.expected), 'Mix real + variegados'],
    ['Peso útil en bandejas', g(balance.useful), 'Suma de pesos netos'],
    ['Sobrante en máquina', g(balance.leftover), LEFTOVER_DESTINATIONS[destination]],
  ];
  return (
    <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
      <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
        <div>
          <Label className="text-xs">Sobrante en máquina (g)</Label>
          <Input type="number" min="0" className="h-9" value={leftover || ''} placeholder="0" onChange={e => onLeftover(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {Object.entries(LEFTOVER_DESTINATIONS).map(([v, l]) => (
            <button key={v} type="button" onClick={() => onDestination(v)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${destination === v ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/60 text-sm">
        {rows.map(([label, value, hint]) => (
          <div key={label} className="flex items-center justify-between py-1.5">
            <span>{label} <span className="text-[11px] text-muted-foreground">· {hint}</span></span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-1.5 font-semibold">
          <span>Merma de proceso / transferencia</span>
          <span className={`font-mono ${negative ? 'text-sky-700' : 'text-amber-700'}`}>{g(balance.loss)} ({balance.lossPct.toFixed(1)}%)</span>
        </div>
      </div>
      {negative && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-300 px-2 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          El peso útil más el sobrante supera el teórico. Revisa los pesos; puedes confirmar igual si corresponde a arrastre de máquina.
        </p>
      )}
    </div>
  );
}