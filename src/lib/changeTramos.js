import { EUR_PER_USD } from '@/lib/useExchangeRate';
import { isRefundDataComplete } from '@/components/pos/RefundCustomerFields';

// Tramos del vuelto: el exceso pagado se reparte en uno o varios tramos,
// cada uno con su método, moneda, billetera de salida y monto nativo.

export const isDigitalMethod = (m) => m === 'pago_movil' || m === 'transferencia';

export const usdToNative = (usd, currency, eurVes) =>
  currency === 'EUR' ? usd * EUR_PER_USD : usd * EUR_PER_USD * eurVes;

export const nativeToUsd = (amount, currency, eurVes) => {
  if (!(amount > 0)) return 0;
  if (currency === 'EUR') return amount / EUR_PER_USD;
  return eurVes > 0 ? amount / eurVes / EUR_PER_USD : 0;
};

export const makeTramo = (usd = 0, eurVes = 1, currency = 'VES') => ({
  id: Math.random().toString(36).slice(2),
  method: 'efectivo',
  currency,
  walletId: '',
  amount: usd > 0 ? usdToNative(usd, currency, eurVes).toFixed(2) : '',
  customerData: { tipo_cuenta: 'pago_movil' },
  reference: '',
});

export const tramoUsd = (t, eurVes) => nativeToUsd(parseFloat(t.amount) || 0, t.currency, eurVes);

export const tramosTotalUsd = (tramos, eurVes) => tramos.reduce((s, t) => s + tramoUsd(t, eurVes), 0);

/** Listos para confirmar: la suma iguala el exceso y cada tramo está completo. */
export function tramosReady(tramos, excessUSD, eurVes) {
  if (Math.abs(tramosTotalUsd(tramos, eurVes) - excessUSD) > 0.01) return false;
  return tramos.every(t =>
    (parseFloat(t.amount) || 0) > 0 && !!t.walletId &&
    (!isDigitalMethod(t.method) || isRefundDataComplete(t.customerData, t.reference, t.method))
  );
}

/** Convierte los tramos del formulario al formato que guarda la venta. */
export const buildChangeBreakdown = (tramos, eurVes, wallets) => tramos.map(t => ({
  method: t.method,
  currency: t.currency,
  amount_native: +(parseFloat(t.amount) || 0).toFixed(2),
  amount_usd_equivalent: +tramoUsd(t, eurVes).toFixed(4),
  wallet_id: t.walletId,
  wallet_name: wallets.find(w => w.id === t.walletId)?.name || '',
  ...(isDigitalMethod(t.method) ? { customer_data: t.customerData, reference: t.reference } : {}),
}));

/** Campos escalares agregados (compatibilidad con reportes existentes). */
export function aggregateChangeFields(breakdown) {
  if (!breakdown?.length) return {};
  const usd = breakdown.reduce((s, t) => s + (t.amount_usd_equivalent || 0), 0);
  const single = breakdown.length === 1 ? breakdown[0] : null;
  const firstDigital = breakdown.find(t => isDigitalMethod(t.method));
  return {
    change_breakdown: breakdown,
    change_amount: single ? single.amount_native : +(usd * EUR_PER_USD).toFixed(2),
    change_currency: single ? single.currency : 'EUR',
    change_amount_usd_equivalent: +usd.toFixed(2),
    change_wallet_id: breakdown[0].wallet_id,
    change_wallet_name: breakdown.map(t => t.wallet_name).join(' + '),
    change_method: firstDigital ? firstDigital.method : 'efectivo',
    ...(firstDigital?.customer_data ? { change_customer_data: firstDigital.customer_data } : {}),
    ...(firstDigital?.reference ? { change_reference: firstDigital.reference } : {}),
    ...(firstDigital?.refund_request_id ? { change_refund_request_id: firstDigital.refund_request_id } : {}),
  };
}

/** Vuelto entregado en efectivo (USD base) de una venta, nuevo o legado. */
export function saleCashChangeUsd(sale) {
  if (Array.isArray(sale.change_breakdown) && sale.change_breakdown.length) {
    return sale.change_breakdown
      .filter(t => t.method === 'efectivo')
      .reduce((s, t) => s + (t.amount_usd_equivalent || 0), 0);
  }
  return (sale.change_method || 'efectivo') === 'efectivo' ? (sale.change_amount_usd_equivalent || 0) : 0;
}