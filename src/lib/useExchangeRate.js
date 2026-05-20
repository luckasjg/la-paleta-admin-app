import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'exchange_rate_usd_ves';
const DEFAULT_RATE = 38;

export function useExchangeRate() {
  const [rate, setRateState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = parseFloat(raw);
      return parsed > 0 ? parsed : DEFAULT_RATE;
    } catch {
      return DEFAULT_RATE;
    }
  });

  // Sync across tabs/components
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const parsed = parseFloat(e.newValue);
        if (parsed > 0) setRateState(parsed);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setRate = useCallback((value) => {
    const num = parseFloat(value);
    if (!num || num <= 0) return;
    setRateState(num);
    try { localStorage.setItem(STORAGE_KEY, String(num)); } catch {
      // localStorage write failed; ignore (rate still updates in-memory)
    }
  }, []);

  return { rate, setRate };
}

export const formatUSD = (n) => `$${(n || 0).toFixed(2)}`;
export const formatVES = (n) => `Bs. ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;