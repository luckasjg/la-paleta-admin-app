import React from 'react';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import { getUnitFlavors, unitNames } from '@/lib/unitFlavors';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

function unitToppings(item, i) {
  const list = (item.unit_toppings?.[i] || []).filter(t => !t.none && t.product_name);
  return list.map(t => `${t.product_name}${t.included ? '' : ' (extra)'}`).join(', ');
}

export default function SaleItemsList({ items = [] }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">Sin productos registrados</p>;
  return (
    <div className="space-y-2">
      {items.map((it, idx) => {
        const qty = it.quantity || 1;
        const units = getUnitFlavors(it, qty);
        const hasDetail = units.some(u => u.length) || (it.unit_toppings || []).some(u => u?.length) || it.flavor;
        return (
          <div key={idx} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground w-6">{qty}×</span>
              <span className="flex-1 font-medium">{it.product_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{eur(it.unit_price)}</span>
              <span className="font-mono font-semibold w-20 text-right">{eur(it.subtotal)}</span>
            </div>
            {hasDetail && (
              <div className="ml-8 mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                {units.map((u, i) => {
                  const fl = unitNames(u) || (i === 0 ? it.flavor : '');
                  const tp = unitToppings(it, i);
                  if (!fl && !tp) return null;
                  return (
                    <p key={i}>
                      {qty > 1 && <span className="font-medium text-foreground/70">Unidad {i + 1}: </span>}
                      {fl || 'Sin sabor'}{tp && <span> · {tp}</span>}
                    </p>
                  );
                })}
              </div>
            )}
            {it.promo_discount > 0 && (
              <p className="ml-8 text-xs text-emerald-600">−{eur(it.promo_discount)} {(it.promo_names || []).join(', ')}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}