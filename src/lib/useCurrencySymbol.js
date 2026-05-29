import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'system_currency_symbol';
const DEFAULT = '$';
const EVENT = 'system_currency_symbol_change';

export const CURRENCY_OPTIONS = [
  { value: '$', label: 'Dólar (USD)', symbol: '$' },
  { value: '€', label: 'Euro (EUR)', symbol: '€' },
];

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export function useCurrencySymbol() {
  const [symbol, setSymbolState] = useState(read);

  useEffect(() => {
    const handler = () => setSymbolState(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const setSymbol = useCallback((value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
    setSymbolState(value);
  }, []);

  return { symbol, setSymbol };
}