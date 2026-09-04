import React from 'react';
import { formatUSD } from '@/lib/useExchangeRate';

/** Carta y precios agrupados por categoría, con botón de agregar al pedido. */
export default function ProductCatalog({ productsByCategory, onAdd }) {
  return (
    <div className="px-0.5 pt-[3px]">
      {Object.entries(productsByCategory).map(([cat, items]) => (
        <div key={cat} className="mb-[18px]">
          <h3 className="mb-[7px] border-b-2 border-dashed border-[#D3D4D9] pb-1.5 text-[10px] font-[950] uppercase tracking-[0.18em] text-[#777984]">
            {cat}
          </h3>
          {items.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-[7px] border-b border-[#24252b22] py-2.5"
            >
              <span className="flex-1 text-[13px] font-extrabold leading-[1.2]">
                {p.name}
                {p.size_label && (
                  <em className="ml-1 not-italic text-[11px] text-[#777984]">{p.size_label}</em>
                )}
              </span>
              <b className="whitespace-nowrap text-[13px] font-[950] text-[#24252b]">
                {formatUSD(p.price)}
              </b>
              <button
                onClick={() => onAdd(p)}
                aria-label={`Agregar ${p.name}`}
                className="menu-btn h-[37px] w-[37px] flex-none rounded-full border-0 bg-[#F0A23B] text-[22px] leading-none text-[#24252b] shadow-[0_5px_9px_#F0A23B55] hover:bg-[#24252b] hover:text-white"
              >
                +
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}