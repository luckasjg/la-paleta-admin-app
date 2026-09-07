// Borrador del POS: conserva la venta en curso en el dispositivo para que no
// se pierda al cambiar de departamento. Se limpia al cobrar la venta.
import { useEffect, useRef, useState } from 'react';

const KEY = 'pos_sale_draft';

export function getPosDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePosDraft(draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch { /* almacenamiento lleno o bloqueado */ }
}

export function clearPosDraft() {
  localStorage.removeItem(KEY);
}

/**
 * Restaura una vez el borrador guardado y lo mantiene sincronizado.
 * @param {{ cart, sourceLocation, linkedOrder }} state estado actual del POS
 * @param {{ setCart, setSourceLocation, setLinkedOrder }} setters
 */
export function usePosDraft(state, setters) {
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);
  const justRestored = useRef(false);

  // Restaurar al montar
  useEffect(() => {
    const draft = getPosDraft();
    hydrated.current = true;
    if (!draft || !Array.isArray(draft.cart) || draft.cart.length === 0) return;
    setters.setCart(draft.cart);
    if (draft.sourceLocation) setters.setSourceLocation(draft.sourceLocation);
    if (draft.linkedOrder) setters.setLinkedOrder(draft.linkedOrder);
    justRestored.current = true;
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar en cada cambio (sólo después de hidratar, para no borrar el borrador)
  useEffect(() => {
    if (!hydrated.current) return;
    if (!state.cart || state.cart.length === 0) {
      // Evita borrar el borrador en el primer render, antes de que la
      // restauración se refleje en el estado.
      if (justRestored.current) {
        justRestored.current = false;
        return;
      }
      clearPosDraft();
      return;
    }
    justRestored.current = false;
    savePosDraft({
      cart: state.cart,
      sourceLocation: state.sourceLocation,
      linkedOrder: state.linkedOrder,
      saved_at: new Date().toISOString(),
    });
  }, [state.cart, state.sourceLocation, state.linkedOrder]);

  return { restored, dismissRestored: () => setRestored(false) };
}