import React from 'react';
import { Gift, Check } from 'lucide-react';

/**
 * Invitación opcional a registrarse al final del pedido.
 * Si el cliente ya está registrado en este dispositivo, solo confirma su cuenta.
 */
export default function CustomerRegisterCard({ profile, wantsRegister, onToggle }) {
  if (profile) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-[20px] border border-[#E1E1E6] bg-white p-4 text-[12px] font-extrabold text-[#24252b] shadow-[0_10px_22px_#16161d12]">
        <Check className="h-4 w-4 text-[#F0A23B]" />
        Estás registrado como {profile.full_name}. Guardaremos este pedido en tu cuenta.
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggle(!wantsRegister)}
      className={
        wantsRegister
          ? 'menu-btn mb-4 flex w-full items-start gap-3 rounded-[20px] border-2 border-[#F0A23B] bg-white p-4 text-left shadow-[0_10px_22px_#16161d12]'
          : 'menu-btn mb-4 flex w-full items-start gap-3 rounded-[20px] border-2 border-[#D6D7DD] bg-[#F7F7F8] p-4 text-left'
      }
    >
      <span
        className={
          wantsRegister
            ? 'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#F0A23B] text-[#24252b]'
            : 'mt-0.5 h-5 w-5 flex-none rounded-full border-2 border-[#D6D7DD] bg-white'
        }
      >
        {wantsRegister && <Check className="h-3 w-3" />}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-[950] text-[#24252b]">
          <Gift className="h-4 w-4 text-[#F0A23B]" />
          Quiero registrarme (opcional)
        </span>
        <span className="mt-1 block text-[11px] leading-[1.35] text-[#777984]">
          Guardamos tus datos para tus próximos pedidos y para acumular beneficios. Puedes seguir
          como invitado sin registrarte.
        </span>
      </span>
    </button>
  );
}