import React from 'react';

const BAR = { available: 'bg-emerald-500', blocked: 'bg-amber-500', progress: 'bg-primary' };

export default function LoyaltyMiniBar({ standing, className = '' }) {
  if (!standing) return null;
  return (
    <div className={`w-28 shrink-0 ${className}`} title={standing.label}>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span className="truncate">{standing.status === 'available' ? 'Canjear' : standing.next}</span>
        <span className="font-mono">{Math.floor(standing.pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${BAR[standing.status]}`} style={{ width: `${standing.pct}%` }} />
      </div>
    </div>
  );
}