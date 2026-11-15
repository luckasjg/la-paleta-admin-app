import React from 'react';
import { Input } from '@/components/ui/input';

const f2 = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString('es-VE', { maximumFractionDigits: 2 });

export default function ProcessBalanceCard({ totalInput, yieldAmount, byproductsTotal, unit, onYieldChange }) {
  const y = parseFloat(yieldAmount) || 0;
  const pct = (v) => (totalInput > 0 ? (v / totalInput) * 100 : 0);
  const waste = totalInput - y - byproductsTotal;
  const overflow = waste < -0.5;

  const setPct = (v) => {
    const p = parseFloat(v) || 0;
    onYieldChange(parseFloat(((p / 100) * totalInput).toFixed(2)));
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span className="font-medium text-foreground">Balance del proceso</span>
        <span className="font-mono">Entrada: {f2(totalInput)} {unit}</span>
      </div>
      <div className="grid grid-cols-[1fr,110px,90px] gap-2 items-center">
        <span>Rendimiento principal</span>
        <div className="relative">
          <Input type="number" step="0.01" value={yieldAmount} onChange={e => onYieldChange(e.target.value)} className="h-8 text-right pr-7" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{unit}</span>
        </div>
        <div className="relative">
          <Input type="number" step="0.01" value={totalInput > 0 ? parseFloat(pct(y).toFixed(2)) : ''} onChange={e => setPct(e.target.value)} disabled={totalInput <= 0} className="h-8 text-right pr-6" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
        </div>
      </div>
      {byproductsTotal > 0 && (
        <div className="flex justify-between text-blue-700">
          <span>Subproductos reutilizables</span>
          <span className="font-mono">{f2(byproductsTotal)} {unit} · {f2(pct(byproductsTotal))}%</span>
        </div>
      )}
      <div className={`flex justify-between ${overflow ? 'text-destructive' : 'text-muted-foreground'}`}>
        <span>Desecho / merma no recuperable</span>
        <span className="font-mono">{f2(waste)} {unit} · {f2(pct(waste))}%</span>
      </div>
      {overflow && <p className="text-xs text-destructive">Las salidas superan el peso total de insumos.</p>}
    </div>
  );
}