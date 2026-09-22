import React from 'react';
import { Maximize2 } from 'lucide-react';

/**
 * Envuelve una tarjeta del dashboard y añade un botón discreto para abrir su
 * vista ampliada. Sin `onExpand` (por ejemplo al renderizar el PDF) el botón
 * no se dibuja y la tarjeta queda exactamente como antes.
 */
export default function ExpandableCard({ label, onExpand, className, children }) {
  if (!onExpand) return <>{children}</>;
  return (
    <div className={`relative group ${className || ''}`}>
      {children}
      <button
        type="button"
        onClick={onExpand}
        title={`Ver ${label} en detalle`}
        aria-label={`Ver ${label} en detalle`}
        className="absolute top-2 right-2 z-10 rounded-md p-1.5 bg-card/80 backdrop-blur-sm text-muted-foreground/70 opacity-60 hover:opacity-100 hover:bg-secondary hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Cabecera fina para grupos de tarjetas (rejillas de KPIs), donde no hay una
 * esquina libre: muestra el título de la sección y el botón de expandir.
 */
export function ExpandableSection({ title, label, onExpand, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            title={`Ver ${label || title} en detalle`}
            aria-label={`Ver ${label || title} en detalle`}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground/80 hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Detalle
          </button>
        )}
      </div>
      {children}
    </div>
  );
}