import { EUR_PER_USD } from '@/lib/useExchangeRate';

export const vesToUsd = (ves, eurVes) => (eurVes > 0 ? (ves || 0) / eurVes / EUR_PER_USD : 0);

/**
 * Realidad de la gaveta por moneda física.
 * cashUsd: divisas en USD base · cashVes: bolívares nativos
 * digitalUsd: USD base (Binance, Zelle…) · digitalVes: bolívares nativos (pago móvil, punto…)
 */
export function computeCurrencyBreakdown({ register, sales = [], abonos = [], eurVes }) {
  let cashUsd = register?.opening_cash_usd || 0;
  let cashVes = register?.opening_cash_ves || 0;
  let digitalUsd = 0;
  let digitalVes = 0;

  sales.filter(s => s.status !== 'voided').forEach(s => {
    const pays = s.payments || [];
    if (pays.length === 0) {
      cashUsd += s.cash_amount || 0;
      digitalUsd += s.digital_amount || 0;
    }
    pays.forEach(p => {
      const usd = p.amount_usd_equivalent || 0;
      if (p.method === 'efectivo_ves') cashVes += p.amount_ves || 0;
      else if (p.method === 'efectivo_usd' || p.method === 'efectivo') cashUsd += usd;
      else if ((p.amount_ves || 0) > 0) digitalVes += p.amount_ves;
      else digitalUsd += usd;
    });
    const tramos = s.change_breakdown?.length
      ? s.change_breakdown
      : (s.change_amount_usd_equivalent > 0
        ? [{ method: s.change_method || 'efectivo', currency: s.change_currency, amount_native: s.change_amount, amount_usd_equivalent: s.change_amount_usd_equivalent }]
        : []);
    tramos.forEach(t => {
      if (t.method !== 'efectivo') return;
      if (t.currency === 'VES') cashVes -= t.amount_native || 0;
      else cashUsd -= t.amount_usd_equivalent || 0;
    });
  });

  abonos.forEach(a => {
    const usd = a.amount_usd_equivalent || 0;
    if (a.method === 'efectivo_ves') cashVes += a.amount_native || 0;
    else if (a.method === 'efectivo_usd') cashUsd += usd;
    else if (a.currency === 'VES') digitalVes += a.amount_native || 0;
    else digitalUsd += usd;
  });

  return { cashUsd, cashVes, digitalUsd, digitalVes, cashVesUsd: vesToUsd(cashVes, eurVes), digitalVesUsd: vesToUsd(digitalVes, eurVes) };
}

export const fmtBs = (n) => `Bs ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtUsd = (n) => `$${(n || 0).toFixed(2)}`;
export const signed = (n, fmt) => `${n > 0.005 ? '+' : n < -0.005 ? '−' : ''}${fmt(Math.abs(n))}`;
export const diffClass = (n) => (n < -0.005 ? 'text-destructive' : n > 0.005 ? 'text-yellow-600' : 'text-green-700');