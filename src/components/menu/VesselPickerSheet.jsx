import React from 'react';
import { X, Coffee, GlassWater } from 'lucide-react';

/**
 * Bottom-sheet para elegir Taza (cerámica) o Vaso (desechable),
 * igual que el diálogo del POS para productos con vessel_optional.
 */
export default function VesselPickerSheet({ product, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <div className="w-full bg-[#1a0e0a] border-t-2 border-amber-500/40 rounded-t-2xl px-4 py-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-black text-amber-100">¿Cómo lo quieres servido?</h3>
          <button onClick={onCancel} className="text-amber-300/70 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-amber-300/60 mb-4">{product.name}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onConfirm('taza')}
            className="flex flex-col items-center gap-2 py-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 active:scale-95 transition-transform"
          >
            <Coffee className="h-9 w-9 text-amber-400" />
            <span className="font-black text-sm">Taza</span>
            <span className="text-[10px] text-amber-300/60">Cerámica · en el local</span>
          </button>
          <button
            onClick={() => onConfirm('vaso')}
            className="flex flex-col items-center gap-2 py-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 active:scale-95 transition-transform"
          >
            <GlassWater className="h-9 w-9 text-amber-400" />
            <span className="font-black text-sm">Vaso</span>
            <span className="text-[10px] text-amber-300/60">Desechable · para llevar</span>
          </button>
        </div>
      </div>
    </div>
  );
}