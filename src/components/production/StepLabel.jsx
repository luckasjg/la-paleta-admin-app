import React from 'react';

export default function StepLabel({ n, title, extra }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Paso {n} — {title}</p>
      {extra && <span className="font-mono text-xs text-muted-foreground">{extra}</span>}
    </div>
  );
}