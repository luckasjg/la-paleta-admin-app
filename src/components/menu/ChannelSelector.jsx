import React from 'react';
import { Home, ShoppingBag, Bike } from 'lucide-react';
import { CHANNEL_LABELS } from '@/lib/orderMessage';

const CHANNELS = ['local', 'pickup', 'delivery'];
const SHORT = { local: 'En el local', pickup: 'Pickup', delivery: 'Delivery' };
const ICONS = { local: Home, pickup: ShoppingBag, delivery: Bike };

/** Selector de modalidad del menú móvil: filtra el catálogo en tiempo real. */
export default function ChannelSelector({ value, onChange }) {
  return (
    <section className="menu-wave menu-anim-rise menu-delay-15 relative mx-[14px] mb-[17px] rounded-[22px] border border-[#E1E1E6] bg-white px-[13px] pb-5 pt-[17px] shadow-[0_12px_25px_#16161d12]">
      <p className="relative z-[1] mb-2.5 text-[10px] font-[950] uppercase tracking-[0.17em] text-[#24252b]">
        ¿Cómo lo quieres?
      </p>
      <div className="relative z-[1] grid grid-cols-3 gap-[7px]">
        {CHANNELS.map((c) => {
          const Icon = ICONS[c];
          const selected = value === c;
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              title={CHANNEL_LABELS[c]}
              className={
                selected
                  ? 'menu-btn flex min-h-[45px] flex-col items-center justify-center gap-1 rounded-[13px] border-2 border-[#24252b] bg-[#24252b] text-[11px] font-[900] text-white shadow-[0_5px_12px_#24252b44]'
                  : 'menu-btn flex min-h-[45px] flex-col items-center justify-center gap-1 rounded-[13px] border-2 border-[#D6D7DD] bg-[#F7F7F8] text-[11px] font-[900] text-[#555762]'
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {SHORT[c]}
            </button>
          );
        })}
      </div>
      {value === 'delivery' && (
        <p className="relative z-[1] mt-2.5 rounded-[14px] bg-[#FFF3E8] px-2.5 py-2 text-[11px] text-[#4a3023]">
          Mostrando solo productos disponibles para delivery.
        </p>
      )}
    </section>
  );
}