import React from 'react';
import { CHANNEL_LABELS } from '@/lib/orderMessage';

const CHANNELS = ['local', 'pickup', 'delivery'];
const SHORT = { local: 'En el local', pickup: 'Pickup', delivery: 'Delivery' };

/** Selector de modalidad del menú móvil: filtra el catálogo en tiempo real. */
export default function ChannelSelector({ value, onChange }) {
  return (
    <div className="px-4 pt-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold mb-2">
        ¿Cómo lo quieres?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {CHANNELS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={CHANNEL_LABELS[c]}
            className={
              value === c
                ? 'h-11 rounded-xl border-2 border-amber-400 bg-amber-500/20 text-amber-50 font-black text-xs'
                : 'h-11 rounded-xl border border-amber-500/25 bg-black/30 text-amber-200/70 font-medium text-xs'
            }
          >
            {SHORT[c]}
          </button>
        ))}
      </div>
      {value === 'delivery' && (
        <p className="text-[11px] text-amber-300/60 mt-2">
          Mostrando solo productos disponibles para delivery.
        </p>
      )}
    </div>
  );
}