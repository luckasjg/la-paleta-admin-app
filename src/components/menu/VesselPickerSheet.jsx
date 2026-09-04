import React from 'react';
import { X, Coffee, GlassWater } from 'lucide-react';

/**
 * Bottom-sheet para elegir Taza (cerámica) o Vaso (desechable),
 * igual que el diálogo del POS para productos con vessel_optional.
 */
export default function VesselPickerSheet({ product, onCancel, onConfirm }) {
  const option =
    'menu-btn flex flex-col items-center gap-2 rounded-[13px] border border-[#676872] bg-[#303139] py-6 text-white hover:border-[#F0A23B]';

  return (
    <div className="menu-font fixed inset-0 z-50 flex items-end bg-[#16161d99]">
      <div className="menu-anim-cardin w-full rounded-t-[22px] border-t-4 border-[#F0A23B] bg-[#24252b] px-4 py-5 text-white">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="m-0 text-[18px] font-[950] leading-none">¿Cómo lo quieres servido?</h3>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="menu-btn flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#303139] text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3.5 text-[12px] text-[#D7D7DD]">{product.name}</p>

        <p className="mb-2 text-[10px] font-[950] uppercase tracking-[0.16em] text-[#F6D5C0]">
          En cómo puede servirse
        </p>
        <div className="grid grid-cols-2 gap-[7px]">
          <button onClick={() => onConfirm('taza')} className={option}>
            <Coffee className="h-8 w-8 text-[#F0A23B]" />
            <span className="text-[13px] font-[950]">Taza</span>
            <span className="text-[10px] text-[#D7D7DD]">Cerámica · en el local</span>
          </button>
          <button onClick={() => onConfirm('vaso')} className={option}>
            <GlassWater className="h-8 w-8 text-[#F0A23B]" />
            <span className="text-[13px] font-[950]">Vaso</span>
            <span className="text-[10px] text-[#D7D7DD]">Desechable · para llevar</span>
          </button>
        </div>
      </div>
    </div>
  );
}