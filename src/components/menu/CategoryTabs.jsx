import React from 'react';

/** Barra sticky de categorías con scroll horizontal y salto a sección. */
export default function CategoryTabs({ categories, activeCategory, onSelect }) {
  return (
    <div className="menu-no-scrollbar sticky top-0 z-[4] -mx-4 flex gap-2 overflow-x-auto border-b border-[#E1E1E6] bg-[#F4F4F6]/95 px-4 py-2.5 backdrop-blur">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={
            activeCategory === cat
              ? 'menu-btn flex-none whitespace-nowrap rounded-full border-2 border-[#24252b] bg-[#24252b] px-3.5 py-2 text-[11px] font-[950] uppercase tracking-[0.09em] text-white'
              : 'menu-btn flex-none whitespace-nowrap rounded-full border-2 border-[#D6D7DD] bg-white px-3.5 py-2 text-[11px] font-[950] uppercase tracking-[0.09em] text-[#555762]'
          }
        >
          {cat}
        </button>
      ))}
    </div>
  );
}