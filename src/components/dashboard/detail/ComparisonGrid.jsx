import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { pctDelta } from '@/lib/dashboardAnalytics';

function DeltaBadge({ current, previous, invert }) {
  const delta = pctDelta(current, previous);
  const flat = Math.abs(delta) < 0.05;
  const good = invert ? delta < 0 : delta > 0;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? 'text-muted-foreground' : good ? 'text-emerald-600' : 'text-destructive';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {flat ? '0.0%' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
    </span>
  );
}

/**
 * Comparación de métricas contra un periodo de referencia.
 * `rows` = [{ label, current, previous, format, invert }]
 */
export default function ComparisonGrid({ title, referenceLabel, rows }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {referenceLabel && <p className="text-[11px] text-muted-foreground">vs. {referenceLabel}</p>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map(r => (
          <div key={r.label} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">{r.label}</p>
            <p className="text-lg font-bold font-mono tracking-tight">{r.format(r.current)}</p>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-muted-foreground font-mono">{r.format(r.previous)}</span>
              <DeltaBadge current={r.current} previous={r.previous} invert={r.invert} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}