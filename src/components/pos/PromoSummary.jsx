import React from 'react';
import { X, RotateCcw, Tag } from 'lucide-react';

// Desglose del descuento promocional y control para quitar / reactivar promociones en esta venta.
export default function PromoSummary({ applied, disabled, discount, fmt, onRemove, onRestore }) {
  if (!applied.length && !disabled.length) return null;
  return (
    <div className="space-y-1.5">
      {applied.length > 0 && (
        <div className="flex items-center justify-between text-sm font-semibold text-emerald-700">
          <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Descuento Promocional</span>
          <span>-{fmt(discount)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {applied.map(a => (
          <span key={a.promotion_id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 pl-2 pr-1 py-0.5 text-[11px] font-medium">
            {a.name} · -{fmt(a.amount)}
            <button type="button" onClick={() => onRemove(a.promotion_id)} className="rounded-full p-0.5 hover:bg-emerald-200" title="Quitar en esta venta">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {disabled.map(p => (
          <button key={p.id} type="button" onClick={() => onRestore(p.id)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
            <RotateCcw className="h-3 w-3" /> {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}