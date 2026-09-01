import React from 'react';
import { formatUSD } from '@/lib/useExchangeRate';

export default function OrderItemsList({ items = [] }) {
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-start justify-between gap-3 text-sm border-b border-dashed border-border pb-2 last:border-0">
          <div className="flex-1">
            <p className="font-medium">
              {it.quantity || 1} × {it.product_name}
            </p>
            {Array.isArray(it.flavors) && it.flavors.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {it.flavors.map((f) => `${f.recipe_name}${f.grams ? ` (${Math.round(f.grams)}g)` : ''}`).join(' · ')}
              </p>
            )}
            {it.vessel && (
              <p className="text-xs text-muted-foreground capitalize">Recipiente: {it.vessel}</p>
            )}
            {it.notes && <p className="text-xs text-muted-foreground italic">{it.notes}</p>}
          </div>
          <span className="font-mono text-sm whitespace-nowrap">{formatUSD(it.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}