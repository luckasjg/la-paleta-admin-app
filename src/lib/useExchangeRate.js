import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_EUR_VES = 38;

// Paridad fija del negocio: 1 USD de precio base = 1 EUR cobrado.
// Es una constante del sistema, no se configura.
export const EUR_PER_USD = 1;

export const RATES_QUERY_KEY = ['exchange_rates'];

const num = (v, fallback) => {
  const n = parseFloat(v);
  return n > 0 ? n : fallback;
};

/**
 * Lee la tasa EUR↔VES centralizada desde ShopSetting (la escribe el workflow
 * que consulta el BCV dos veces al día). Es la única tasa del sistema: los
 * bolívares siempre se calculan con ella. Si el admin activó el override
 * manual, esa tasa tiene prioridad.
 */
export async function loadRates() {
  const rows = await base44.entities.ShopSetting.list();
  const map = {};
  for (const r of rows || []) map[r.key] = r.value;

  const isManual = map.use_manual_rate === 'true';
  const autoEurVes = num(map.exchange_rate_eur_ves, DEFAULT_EUR_VES);
  const eurVes = isManual ? num(map.manual_rate_eur_ves, autoEurVes) : autoEurVes;

  return {
    eurVes,
    isManual,
    lastFetch: map.last_bcv_fetch_at || '',
    lastError: map.last_bcv_fetch_error || '',
    autoEurVes,
  };
}

const FALLBACK = {
  eurVes: DEFAULT_EUR_VES,
  isManual: false,
  lastFetch: '',
  lastError: '',
  autoEurVes: DEFAULT_EUR_VES,
};

export function useExchangeRate() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: RATES_QUERY_KEY,
    queryFn: loadRates,
    staleTime: 5 * 60 * 1000,
  });

  const rates = data || FALLBACK;

  // Override manual (sólo admin por RLS de ShopSetting).
  const setRate = useCallback(async ({ eurVes, enabled = true }) => {
    const rows = await base44.entities.ShopSetting.list();
    const byKey = {};
    for (const r of rows || []) byKey[r.key] = r;
    const write = async (key, value) => {
      const clean = String(value);
      if (byKey[key]) await base44.entities.ShopSetting.update(byKey[key].id, { value: clean });
      else await base44.entities.ShopSetting.create({ key, value: clean });
    };
    if (eurVes != null) await write('manual_rate_eur_ves', eurVes);
    await write('use_manual_rate', enabled ? 'true' : 'false');
    await qc.invalidateQueries({ queryKey: RATES_QUERY_KEY });
  }, [qc]);

  return {
    // `rate` es la tasa con la que se convierte a bolívares (EUR↔VES).
    rate: rates.eurVes,
    eurVes: rates.eurVes,
    isManual: rates.isManual,
    lastFetch: rates.lastFetch,
    lastError: rates.lastError,
    autoEurVes: rates.autoEurVes,
    isLoading,
    setRate,
  };
}

// Lee el símbolo de divisa configurado por el usuario en /configuracion.
// Default `$` si no hay nada guardado o el storage no está disponible.
const readCurrencySymbol = () => {
  try {
    return localStorage.getItem('system_currency_symbol') || '$';
  } catch {
    return '$';
  }
};

export const formatUSD = (n) => `${readCurrencySymbol()}${(n || 0).toFixed(2)}`;
export const formatVES = (n) => `Bs. ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatEUR = (n) => `€${(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;