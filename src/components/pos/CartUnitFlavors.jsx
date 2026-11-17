import React from 'react';
import { Copy } from 'lucide-react';
import { getUnitFlavors, unitNames } from '@/lib/unitFlavors';

// Desglose por unidad de un helado con cantidad > 1 en el carrito del POS.
export default function CartUnitFlavors({ item, onEditUnit, onCopyFirst }) {
  const units = getUnitFlavors(item);
  return (
    <div className="mt-1 space-y-1">
      {units.map((u, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <button type="button" onClick={() => onEditUnit(i)}
            className="flex-1 min-w-0 text-left text-xs rounded-md border border-border bg-background px-2 py-1 hover:bg-muted transition-colors">
            <span className="font-semibold">Unidad {i + 1}</span>{' · '}
            {u.length
              ? <span className="text-muted-foreground">{unitNames(u)}</span>
              : <span className="text-amber-700">por elegir</span>}
          </button>
          {i === 0 && u.length > 0 && (
            <button type="button" onClick={onCopyFirst}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              <Copy className="h-3 w-3" /> Copiar sabores a todas
            </button>
          )}
        </div>
      ))}
    </div>
  );
}