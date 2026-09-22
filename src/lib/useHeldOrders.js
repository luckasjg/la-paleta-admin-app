// Pedidos en espera del POS: el cajero estaciona la venta en curso para atender
// a otro cliente sin perder los datos. Se guardan en el dispositivo (localStorage)
// en una clave distinta al borrador único, así sobreviven recargas y cambios de turno.
import { useCallback, useState } from 'react';

const KEY = 'pos_held_orders';

export function getHeldOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* almacenamiento lleno o bloqueado */ }
}

export function useHeldOrders() {
  const [heldOrders, setHeldOrders] = useState(() => getHeldOrders());

  const nextTurn = heldOrders.reduce((max, o) => Math.max(max, o.turn || 0), 0) + 1;

  const hold = useCallback((data) => {
    const list = getHeldOrders();
    const turn = list.reduce((max, o) => Math.max(max, o.turn || 0), 0) + 1;
    const entry = {
      id: `held_${Date.now()}`,
      turn,
      name: (data.name || '').trim(),
      cart: data.cart,
      sourceLocation: data.sourceLocation,
      linkedOrder: data.linkedOrder || null,
      total_snapshot: data.total_snapshot || 0,
      eur_ves: data.eur_ves || 0,
      cash_register_id: data.cash_register_id || null,
      staff_name: data.staff_name || '',
      saved_at: new Date().toISOString(),
    };
    const next = [...list, entry];
    persist(next);
    setHeldOrders(next);
    return entry;
  }, []);

  const discard = useCallback((id) => {
    const next = getHeldOrders().filter(o => o.id !== id);
    persist(next);
    setHeldOrders(next);
  }, []);

  return { heldOrders, nextTurn, hold, discard };
}