import React from 'react';
import { Minus, Plus, Trash2, ChevronDown, ShoppingBag, Coffee, GlassWater } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';

/**
 * Bottom-sheet del carrito del menú móvil.
 * Colapsado: barra flotante con badge de cantidad. Expandido: lista editable.
 */
export default function CartSheet({
  items,
  total,
  count,
  isOpen,
  onToggle,
  onSetQuantity,
  onRemove,
  onCheckout,
}) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {isOpen && (
        <div className="bg-[#1a0e0a] border-t-2 border-amber-500/40 max-h-[60vh] overflow-y-auto px-4 py-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-amber-100">Mi pedido</h3>
            <button onClick={onToggle} className="text-amber-300/70 p-1">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.key} className="border-b border-amber-500/15 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-50 leading-tight">
                      {it.product_name}
                    </p>
                    <p className="text-xs text-amber-300/60 font-mono">
                      {formatUSD(it.unit_price)} c/u
                    </p>
                  </div>
                  <p className="text-sm font-black font-mono text-amber-200 whitespace-nowrap">
                    {formatUSD(it.subtotal)}
                  </p>
                </div>

                {Array.isArray(it.flavors) && it.flavors.length > 0 && (
                  <p className="text-xs text-amber-300/70 mt-1 leading-snug">
                    {it.flavors.map((f) => `${f.recipe_name} ${f.grams}g`).join(' + ')}
                  </p>
                )}

                {it.flavor_surcharge > 0 && (
                  <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                    Base {formatUSD(it.base_price)} + recargo {formatUSD(it.flavor_surcharge)}
                  </p>
                )}

                {it.vessel && (
                  <p className="text-[11px] text-amber-300/70 mt-0.5 flex items-center gap-1">
                    {it.vessel === 'taza' ? (
                      <><Coffee className="h-3 w-3" /> En taza</>
                    ) : (
                      <><GlassWater className="h-3 w-3" /> En vaso desechable</>
                    )}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => onSetQuantity(it.key, it.quantity - 1)}
                    className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-black text-amber-50 w-6 text-center">
                    {it.quantity}
                  </span>
                  <button
                    onClick={() => onSetQuantity(it.key, it.quantity + 1)}
                    className="h-9 w-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemove(it.key)}
                    className="ml-auto h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onCheckout}
            className="w-full mt-4 h-14 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-base shadow-lg"
          >
            Continuar · {formatUSD(total)}
          </button>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={onToggle}
          className="w-full h-16 bg-gradient-to-r from-amber-500 to-amber-600 text-black flex items-center justify-between px-5 shadow-2xl"
        >
          <span className="flex items-center gap-2 font-black">
            <span className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-black text-amber-300 text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            </span>
            Ver mi pedido
          </span>
          <span className="font-black font-mono text-lg">{formatUSD(total)}</span>
        </button>
      )}
    </div>
  );
}