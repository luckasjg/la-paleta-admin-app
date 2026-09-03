import React from 'react';
import { ShoppingCart, Undo2 } from 'lucide-react';

const TABS = [
  { value: 'vender', label: 'Vender', icon: ShoppingCart },
  { value: 'devoluciones', label: 'Devoluciones', icon: Undo2 },
];

export default function PosTabs({ value, onChange, pendingRefunds = 0 }) {
  return (
    <div className="flex gap-1.5 p-1 rounded-xl bg-secondary w-fit">
      {TABS.map(t => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`min-h-11 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
              active ? 'bg-[#1a365d] text-white shadow' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.value === 'devoluciones' && pendingRefunds > 0 && (
              <span className={`ml-0.5 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                active ? 'bg-white text-[#1a365d]' : 'bg-amber-500 text-white'
              }`}>
                {pendingRefunds}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}