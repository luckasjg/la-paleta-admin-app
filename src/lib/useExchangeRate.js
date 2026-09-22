import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_USD_VES = 38;

export const RATES_QUERY_KEY = ['exchange_rates'];

const num = (v, fallback) => {
  const n = parseFloat(v);
  return n > 0 ? n : fallback;
};

/**
 * Lee las tasas centralizadas desde ShopSetting (escritas automáticamente por
 * el workflow que consulta el BCV dos veces al día). Si el admin activó el
 * override manual, esas tasas manuales tienen prioridad.
 */
export async function loadRates() {
  const rows = await base44.entities.ShopSetting.list();
  const map = {};
  for (const r of rows || []) map[r.key] = r.value;

  const isManual = map.use_manual_rate === 'true';
  const autoUsdVes = num(map.exchange_rate_usd_ves, DEFAULT_USD_VES);
  const autoEurVes = num(map.exchange_rate_eur_ves, autoUsdVes);

  const usdVes = isManual ? num(map.manual_rate_usd_ves, autoUsdVes) : autoUsdVes;
  const eurVes = isManual ? num(map.manual_rate_eur_ves, autoEurVes) : autoEurVes;

  return {
    usdVes,
    eurVes,
    // Cuántos EUR equivale 1 USD de precio base.
    eurPerUsd: eurVes > 0 ? usdVes / eurVes : 1,
    isManual,
    lastFetch: map.last_bcv_fetch_at || '',
    lastError: map.last_bcv_fetch_error || '',
    autoUsdVes,
    autoEurVes,
  };
}

const FALLBACK = {
  usdVes: DEFAULT_USD_VES,
  eurVes: DEFAULT_USD_VES,
  eurPerUsd: 1,
  isManual: false,
  lastFetch: '',
  lastError: '',
  autoUsdVes: DEFAULT_USD_VES,
  autoEurVes: DEFAULT_USD_VES,
};

export function useExchangeRate() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: RATES_QUERY_KEY,
    queryFn: loadRates,
    staleTime: 5 * 60 * 1000,
  });

  const rates = data || FALLBACK;

  // Override manual (sólo admin por RLS de ShopSetting): guarda las tasas
  // manuales y activa el flag para que todo el sistema las use.
  const setRate = useCallback(async ({ usdVes, eurVes, enabled = true }) => {
    const rows = await base44.entities.ShopSetting.list();
    const byKey = {};
    for (const r of rows || []) byKey[r.key] = r;
    const write = async (key, value) => {
      const clean = String(value);
      if (byKey[key]) await base44.entities.ShopSetting.update(byKey[key].id, { value: clean });
      else await base44.entities.ShopSetting.create({ key, value: clean });
    };
    if (usdVes != null) await write('manual_rate_usd_ves', usdVes);
    if (eurVes != null) await write('manual_rate_eur_ves', eurVes);
    await write('use_manual_rate', enabled ? 'true' : 'false');
    await qc.invalidateQueries({ queryKey: RATES_QUERY_KEY });
  }, [qc]);

  return {
    // `rate` sigue siendo la tasa USD↔VES (base contable, no romper consumidores).
    rate: rates.usdVes,
    usdVes: rates.usdVes,
    eurVes: rates.eurVes,
    eurPerUsd: rates.eurPerUsd,
    isManual: rates.isManual,
    lastFetch: rates.lastFetch,
    lastError: rates.lastError,
    autoUsdVes: rates.autoUsdVes,
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