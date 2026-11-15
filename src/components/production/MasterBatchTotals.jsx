import React from 'react';

/** Resumen consolidado del lote maestro. % de merma sobre el peso neto físico total. */
export default function MasterBatchTotals({ items }) {
  const theoretical = items.reduce((s, c) => s + c.summary.expected, 0);
  const physical = items.reduce((s, c) => s + (c.tray.net || 0), 0);
  const loss = theoretical - physical;
  const pct = physical > 0 ? (loss / physical) * 100 : 0;
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-card p-3">
      <p className="text-sm font-semibold mb-2">Resumen del Lote Maestro</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><p className="text-xs text-muted-foreground">Peso total teórico</p><p className="font-mono font-semibold">{theoretical.toFixed(0)}g</p></div>
        <div><p className="text-xs text-muted-foreground">Peso neto físico total</p><p className="font-mono font-semibold">{physical.toFixed(0)}g</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Merma neta del lote</p>
          <p className={`font-mono font-semibold ${loss < 0 ? 'text-sky-700' : 'text-amber-700'}`}>{loss.toFixed(0)}g ({pct.toFixed(1)}%)</p>
        </div>
      </div>
    </div>
  );
}