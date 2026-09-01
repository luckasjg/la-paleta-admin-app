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
    <div className="fixed inset-0 z-50 flex items-end bg-black/70">
      <div className="w-full bg-[#1a0e0a] border-t-2 border-amber-500/40 rounded-t-2xl px-4 py-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-black text-amber-100">Elige tus sabores</h3>
          <button onClick={onCancel} className="text-amber-300/70 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-amber-300/60 mb-4">
          {product.name} · {targetGrams}g en total · hasta {maxFlavors} sabor{maxFlavors > 1 ? 'es' : ''}
        </p>

        <div className="space-y-3">
          {slots.map((fl, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={fl.tray_id}
                onChange={(e) => setTray(idx, e.target.value)}
                className="flex-1 bg-black/40 border border-amber-500/30 rounded-lg px-2 py-3 text-sm text-amber-50"
              >
                <option value="">Sabor {idx + 1}...</option>
                {trays.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.recipe_name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-mono text-amber-300/70 w-12 text-right">{fl.grams}g</span>
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(idx)}
                  className="h-10 w-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-300 shrink-0"
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
            className="mt-3 w-full h-11 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm font-bold flex items-center justify-center gap-1"
          >
            <Plus className="h-4 w-4" /> Agregar sabor ({slots.length}/{maxFlavors})
          </button>
        )}

        <div className="mt-4 rounded-lg border border-amber-500/25 bg-black/30 p-3 text-xs font-mono space-y-1">
          <div className="flex justify-between text-amber-300/70">
            <span>Precio base</span>
            <span>{formatUSD(product.price || 0)}</span>
          </div>
          {surcharge > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Recargo sabor premium</span>
              <span>+{formatUSD(surcharge)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-amber-100 border-t border-amber-500/20 pt-1">
            <span>Total</span>
            <span>{formatUSD(finalPrice)}</span>
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!allFilled}
          className="w-full mt-4 h-14 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-base disabled:opacity-50"
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}