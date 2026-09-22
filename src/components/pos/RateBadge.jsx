import React from 'react';
import { RefreshCw, Lock } from 'lucide-react';
import moment from 'moment';

/**
 * Chip de tasas del POS (sólo lectura). Las tasas son centrales: las
 * sincroniza el BCV dos veces al día o las fija un admin en Configuración.
 */
export default function RateBadge({ eurVes, usdVes, isManual, lastFetch }) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
      {isManual
        ? <Lock className="h-4 w-4 text-amber-500" />
        : <RefreshCw className="h-4 w-4 text-primary" />}
      <div className="leading-tight">
        <p className="text-sm font-mono font-semibold">1 € = Bs. {eurVes.toFixed(2)}</p>
        <p className="text-[10px] text-muted-foreground font-mono">
          1 $ = Bs. {usdVes.toFixed(2)}
          {' · '}
          {isManual ? 'tasa manual' : lastFetch ? `BCV ${moment(lastFetch).format('DD/MM HH:mm')}` : 'BCV'}
        </p>
      </div>
    </div>
  );
}