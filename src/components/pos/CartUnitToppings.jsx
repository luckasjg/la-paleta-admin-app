import React from 'react';
import { getUnitToppings, pendingIn, toppingNames } from '@/lib/toppings';

// Cupos de toppings por unidad de un ítem del carrito.
export default function CartUnitToppings({ item, onEditUnit, fmt }) {
  const units = getUnitToppings(item);
  const inc = item.included_toppings_count || 0;
  return (
    <div className="mt-1 space-y-1">
      {units.map((u, i) => {
        const pending = pendingIn(u, inc);
        const extra = item.unit_topping_extras?.[i] || 0;
        return (
          <button key={i} type="button" onClick={() => onEditUnit(i)}
            className="w-full text-left text-xs rounded-md border border-dashed border-border bg-background px-2 py-1 hover:bg-muted transition-colors">
            <span className="font-semibold">{units.length > 1 ? `U${i + 1} toppings` : 'Toppings'}</span>{' · '}
            {u.length ? <span className="text-muted-foreground">{toppingNames(u)}</span> : null}
            {pending > 0 && <span className="text-amber-700">{u.length ? ' · ' : ''}{pending} incluido(s) por elegir</span>}
            {extra > 0 && <span className="text-primary font-medium"> · extra +{fmt(extra)}</span>}
          </button>
        );
      })}
    </div>
  );
}