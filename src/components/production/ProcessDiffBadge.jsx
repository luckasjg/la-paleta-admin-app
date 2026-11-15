import React from 'react';

/** Diferencia de proceso = neto real − teórico. Negativo: merma; positivo: arrastre de máquina. */
export default function ProcessDiffBadge({ expected, net }) {
  if (!(net > 0)) return null;
  const diff = net - expected;
  const pct = expected > 0 ? (diff / expected) * 100 : 0;
  const sign = diff > 0 ? '+' : '';
  const isCarry = diff > 0;
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-md border bg-muted/40 px-2 py-1.5">
        <p className="text-muted-foreground">Peso Teórico Esperado</p>
        <p className="font-mono font-semibold">{expected.toFixed(0)}g</p>
      </div>
      <div className={`rounded-md border px-2 py-1.5 ${isCarry ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
        <p>{isCarry ? 'Arrastre de máquina' : 'Merma de proceso'}</p>
        <p className="font-mono font-semibold">{sign}{diff.toFixed(0)} g ({sign}{pct.toFixed(1)}%)</p>
      </div>
    </div>
  );
}