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

  const qtyBtn =
    'menu-btn h-8 w-8 rounded-full border border-[#D6D7DD] bg-[#F4F4F6] text-[#24252b] flex items-center justify-center';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[5] bg-[#24252b] text-white shadow-[0_-8px_24px_#16161d33]">
      {isOpen && (
        <div className="menu-anim-cardin max-h-[60vh] overflow-y-auto border-t-4 border-[#F0A23B] bg-white px-4 pb-4 pt-[17px] text-[#24252b]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-[18px] font-[950]">Mi pedido</h3>
            <button
              onClick={onToggle}
              aria-label="Cerrar mi pedido"
              className="menu-btn flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#F4F4F6] text-[#24252b]"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {items.map((it) => (
            <div key={it.key} className="border-b border-[#24252b22] py-2.5">
              <div className="flex justify-between gap-2 text-[13px] font-[850]">
                <span>{it.product_name}</span>
                <b>{formatUSD(it.subtotal)}</b>
              </div>
              <p className="mt-1 text-[11px] text-[#777984]">{formatUSD(it.unit_price)} c/u</p>

              {Array.isArray(it.flavors) && it.flavors.length > 0 && (
                <p className="mt-0.5 text-[11px] leading-snug text-[#777984]">
                  {it.flavors.map((f) => `${f.recipe_name} ${f.grams}g`).join(' + ')}
                </p>
              )}

              {it.flavor_surcharge > 0 && (
                <p className="mt-0.5 text-[11px] font-extrabold text-[#F0A23B]">
                  Base {formatUSD(it.base_price)} + recargo {formatUSD(it.flavor_surcharge)}
                </p>
              )}

              {it.vessel && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#777984]">
                  {it.vessel === 'taza' ? (
                    <><Coffee className="h-3 w-3" /> En taza</>
                  ) : (
                    <><GlassWater className="h-3 w-3" /> En vaso desechable</>
                  )}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2.5">
                <button
                  onClick={() => onSetQuantity(it.key, it.quantity - 1)}
                  aria-label="Quitar una unidad"
                  className={qtyBtn}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <b className="w-5 text-center text-[13px] font-[950]">{it.quantity}</b>
                <button
                  onClick={() => onSetQuantity(it.key, it.quantity + 1)}
                  aria-label="Agregar una unidad"
                  className={qtyBtn}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onRemove(it.key)}
                  aria-label="Eliminar del pedido"
                  className="menu-btn ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#f0b6ae] bg-[#FFF3E8] text-[#c0492f]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={onCheckout}
            className="menu-btn mt-3.5 h-[52px] w-full rounded-[13px] border-0 bg-[#F0A23B] text-[15px] font-[950] text-[#24252b]"
          >
            Continuar · {formatUSD(total)}
          </button>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={onToggle}
          className="menu-btn flex min-h-[64px] w-full items-center justify-between border-0 bg-transparent px-[19px] py-3 text-[14px] font-[950] text-white"
        >
          <span className="flex items-center gap-2.5">
            <span className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-2 -top-2 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[#F0A23B] text-[9px] font-[950] text-[#24252b]">
                {count}
              </span>
            </span>
            Ver mi pedido
          </span>
          <strong className="text-[18px] font-[950]">{formatUSD(total)}</strong>
        </button>
      )}
    </div>
  );
}