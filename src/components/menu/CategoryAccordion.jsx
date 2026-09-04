import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';

/** Una categoría de la carta, desplegable tipo acordeón. */
export default function CategoryAccordion({ category, items, isOpen, onToggle, onAdd }) {
  return (
    <div className="mb-2.5 overflow-hidden rounded-[20px] border border-[#E1E1E6] bg-white shadow-[0_10px_22px_#16161d10]">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="menu-btn flex w-full items-center gap-2 border-0 bg-transparent px-4 py-3.5 text-left"
      >
        <span className="flex-1 text-[11px] font-[950] uppercase tracking-[0.16em] text-[#24252b]">
          {category}
        </span>
        <span className="text-[10px] font-[900] text-[#777984]">{items.length}</span>
        <ChevronDown
          className={
            isOpen
              ? 'h-4 w-4 flex-none text-[#F0A23B] transition-transform duration-300 rotate-180'
              : 'h-4 w-4 flex-none text-[#F0A23B] transition-transform duration-300'
          }
        />
      </button>

      <div
        className={
          isOpen
            ? 'grid transition-[grid-template-rows] duration-300 ease-out grid-rows-[1fr]'
            : 'grid transition-[grid-template-rows] duration-300 ease-out grid-rows-[0fr]'
        }
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-1.5">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-[7px] border-t border-[#24252b18] py-2.5"
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
        </div>
      </div>
    </div>
  );
}