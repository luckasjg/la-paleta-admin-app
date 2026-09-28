import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function DataBlockCard({ block }) {
  return (
    <div className="mt-2 rounded-2xl border border-border bg-secondary/40 p-4">
      {block.titulo &&
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          {block.titulo}
        </div>
      }
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {block.items.map((it, i) =>
        <div key={i} className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{it.label}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{it.value}</p>
            {it.detalle && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{it.detalle}</p>}
          </div>
        )}
      </div>
      {block.fuente &&
      <p className="mt-3 text-[11px] italic text-muted-foreground">Fuente: {block.fuente}</p>
      }
    </div>);
}