import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { BALANCE_TOLERANCE_G } from '@/lib/masterBatch';

export default function BaseBalanceBar({ produced, assigned, onSplit }) {
  const diff = produced - assigned;
  const ok = Math.abs(diff) <= BALANCE_TOLERANCE_G;
  return (
    <div className={`sticky top-0 z-10 rounded-lg border px-3 py-2 text-sm flex items-center justify-between gap-3 ${ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <span>
          Base producida <strong className="font-mono">{produced.toFixed(1)}g</strong> · asignada <strong className="font-mono">{assigned.toFixed(1)}g</strong>
          {!ok && <> · {diff > 0 ? `faltan ${diff.toFixed(1)}g por asignar` : `exceso de ${(-diff).toFixed(1)}g`}</>}
        </span>
      </div>
      {onSplit && <button type="button" onClick={onSplit} className="text-xs underline whitespace-nowrap">Repartir equitativo</button>}
    </div>
  );
}