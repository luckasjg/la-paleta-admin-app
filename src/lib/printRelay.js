import { useEffect, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { RELAY_PORT } from '@/lib/printRelaySource';

const RELAY_URL = `http://localhost:${RELAY_PORT}`;

async function fetchWithTimeout(url, options = {}, ms = 2000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Indica si el relay local está corriendo en esta computadora. */
export function usePrintRelay() {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(`${RELAY_URL}/health`, {}, 1500);
        if (!cancelled) setAvailable(res.ok);
      } catch {
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { available, checking };
}

function buildPayload({ cart, staffName, shift, turn, shopName }) {
  return {
    shop_name: shopName || 'LA PALETA',
    staff_name: staffName,
    shift,
    turn,
    timestamp: moment().format('DD/MM/YYYY HH:mm'),
    items: cart.map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      flavor: i.flavor,
      grams: i.grams,
      vessel: i.vessel,
      is_courtesy: !!i.is_courtesy,
    })),
  };
}

/**
 * Imprime la comanda. Intenta el relay local (instantáneo, sin diálogo) y
 * si no responde cae al diálogo del navegador con el ticket oculto.
 */
export async function printComanda(data) {
  try {
    const res = await fetchWithTimeout(`${RELAY_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(data)),
    }, 3000);
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Error de impresión');
    toast.success('Comanda impresa');
    return true;
  } catch {
    toast.info('Relay local no activo — usando el diálogo de impresión');
    window.print();
    return false;
  }
}