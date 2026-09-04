import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';
import { splitGramsEqually, computeFlavorSurcharge } from '@/lib/flavorSurcharge';

/**
 * Bottom-sheet de selección de sabores del menú móvil.
 * Replica la lógica del POS: hasta max_flavors sabores, gramos divididos
 * equitativamente y recargo por sabores Premium/Sorbete.
 */
export default function FlavorPickerSheet({ product, trays, recipes, onCancel, onConfirm }) {
  const targetGrams = product.grams_per_serving || 80;
  const maxFlavors = Math.max(1, product.max_flavors || product.flavor_count || 1);

  const [slots, setSlots] = useState(() => [
    { tray_id: '', grams: splitGramsEqually(targetGrams, 1)[0] },
  ]);

  const addSlot = () => {
    if (slots.length >= maxFlavors) return;
    const n = slots.length + 1;
    const portions = splitGramsEqually(targetGrams, n);
    setSlots((prev) =>
      prev.map((f, i) => ({ ...f, grams: portions[i] })).concat([{ tray_id: '', grams: portions[n - 1] }])
    );
  };

  const removeSlot = (idx) => {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const portions = splitGramsEqually(targetGrams, next.length || 1);
      return next.map((f, i) => ({ ...f, grams: portions[i] }));
    });
  };

  const setTray = (idx, trayId) =>
    setSlots((prev) => prev.map((f, i) => (i === idx ? { ...f, tray_id: trayId } : f)));

  const allFilled = slots.every((f) => f.tray_id);
  const surcharge = computeFlavorSurcharge(slots, trays, recipes);
  const finalPrice = (product.price || 0) + surcharge;

  const confirm = () => {
    if (!allFilled) return;
    onConfirm({
      flavors: slots.map((f) => ({
        tray_id: f.tray_id,
        recipe_name: trays.find((t) => t.id === f.tray_id)?.recipe_name || '',
        grams: parseFloat(f.grams) || 0,
      })),
      surcharge,
    });
  };

  return (
    <div className="menu-font fixed inset-0 z-50 flex items-end bg-[#16161d99]">
      <div className="menu-anim-cardin max-h-[85vh] w-full overflow-y-auto rounded-t-[22px] border-t-4 border-[#F0A23B] bg-[#24252b] px-4 py-5 text-white">
        <div className="mb-1 flex items-start justify-between">
          <h3 className="m-0 text-[18px] font-[950] leading-none">Elige tus sabores</h3>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            className="menu-btn flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#303139] text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3.5 text-[12px] leading-[1.35] text-[#D7D7DD]">
          {product.name} · {targetGrams}g en total · hasta {maxFlavors} sabor{maxFlavors > 1 ? 'es' : ''}
        </p>

        <div className="space-y-2.5">
          {slots.map((fl, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={fl.tray_id}
                onChange={(e) => setTray(idx, e.target.value)}
                className="min-h-[45px] flex-1 rounded-[13px] border border-[#676872] bg-[#303139] px-2.5 text-[13px] font-[850] text-white"
              >
                <option value="">Sabor {idx + 1}...</option>
                {trays.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.recipe_name}
                  </option>
                ))}
              </select>
              <span className="w-12 text-right text-[11px] font-[900] text-[#F6D5C0]">
                {fl.grams}g
              </span>
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(idx)}
                  aria-label="Quitar sabor"
                  className="menu-btn flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#676872] bg-[#303139] text-[#ffb4a2]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {slots.length < maxFlavors && (
          <button
            onClick={addSlot}
            className="menu-btn mt-2.5 flex min-h-[45px] w-full items-center justify-center gap-1 rounded-[13px] border border-[#676872] bg-[#303139] text-[12px] font-[900] text-white"
          >
            <Plus className="h-4 w-4" /> Agregar sabor ({slots.length}/{maxFlavors})
          </button>
        )}

        <div className="mt-3.5 space-y-1 rounded-[20px] bg-[#303139] p-4 text-[12px]">
          <div className="flex justify-between text-[#D7D7DD]">
            <span>Precio base</span>
            <span>{formatUSD(product.price || 0)}</span>
          </div>
          {surcharge > 0 && (
            <div className="flex justify-between font-extrabold text-[#F0A23B]">
              <span>Recargo sabor premium</span>
              <span>+{formatUSD(surcharge)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#ffffff22] pt-1 text-[13px] font-[950] text-white">
            <span>Total</span>
            <span>{formatUSD(finalPrice)}</span>
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!allFilled}
          className="menu-btn mt-3.5 h-[52px] w-full rounded-[13px] border-0 bg-[#F0A23B] text-[15px] font-[950] text-[#24252b] disabled:opacity-50"
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}