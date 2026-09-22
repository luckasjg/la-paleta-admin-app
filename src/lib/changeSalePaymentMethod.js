import { base44 } from '@/api/base44Client';
import { depositSalePaymentsToWallets } from '@/lib/walletHelpers';

export const CORRECTION_NOTE_PREFIX = 'Corrección de método de pago';

const CASH_METHODS = ['efectivo_usd', 'efectivo_ves'];

/** Deriva los campos legacy (payment_method, cash_amount, digital_amount) de un array de pagos. */
export function derivePaymentSummary(payments = []) {
  const cash = payments
    .filter(p => CASH_METHODS.includes(p.method))
    .reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0);
  const digital = payments
    .filter(p => !CASH_METHODS.includes(p.method))
    .reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0);
  const method = payments.length === 0
    ? 'cortesia'
    : (payments.length > 1 ? 'mixto' : payments[0].method);
  return { method, cash: +cash.toFixed(2), digital: +digital.toFixed(2) };
}

/**
 * Corrige el método de pago de una venta ya registrada, reconciliando billeteras.
 *
 * 1) Calcula el ingreso VIGENTE de la venta por billetera (sale_income + correcciones previas)
 *    y crea movimientos espejo negativos para dejarlo en cero.
 * 2) Deposita los nuevos pagos en las billeteras mapeadas a los métodos elegidos.
 * 3) Actualiza la venta (payments, payment_method, cash_amount, digital_amount, exchange_rate).
 *
 * El movimiento de vuelto (change_given) NO se toca: si el vuelto ya se entregó,
 * ese dinero salió de verdad y debe seguir descontado.
 */
export async function changeSalePaymentMethod({ sale, payments, exchange_rate, operatorEmail = '' }) {
  if (!sale?.id) throw new Error('Venta no encontrada');
  if (sale.status === 'voided') throw new Error('No se puede editar una venta anulada');
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error('Debes registrar al menos un método de pago');
  }

  const wallets = await base44.entities.Wallet.list();
  const txs = await base44.entities.WalletTransaction.filter({ sale_id: sale.id });

  // Ingreso vigente: los depósitos originales más las correcciones ya aplicadas.
  const incomeTxs = txs.filter(t =>
    t.type === 'sale_income' ||
    (t.type === 'manual_adjust' && (t.notes || '').startsWith(CORRECTION_NOTE_PREFIX))
  );

  const netByWallet = {};
  for (const t of incomeTxs) {
    if (!t.wallet_id) continue;
    const entry = netByWallet[t.wallet_id] || {
      wallet_id: t.wallet_id,
      wallet_name: t.wallet_name,
      native: 0,
      usd: 0,
      rate: t.exchange_rate,
    };
    entry.native += t.amount_native || 0;
    entry.usd += t.amount_usd_equivalent || 0;
    netByWallet[t.wallet_id] = entry;
  }

  // 1) Reverso de lo vigente
  const mirrors = [];
  const deltaByWallet = {};
  for (const entry of Object.values(netByWallet)) {
    if (Math.abs(entry.native) < 0.0001) continue;
    mirrors.push({
      wallet_id: entry.wallet_id,
      wallet_name: entry.wallet_name,
      type: 'manual_adjust',
      amount_native: -entry.native,
      amount_usd_equivalent: -entry.usd,
      exchange_rate: entry.rate || exchange_rate,
      sale_id: sale.id,
      notes: `${CORRECTION_NOTE_PREFIX} — reverso del ingreso previo (${sale.payment_method || 'sin método'})${operatorEmail ? ` — por ${operatorEmail}` : ''}`,
      transaction_date: new Date().toISOString(),
    });
    deltaByWallet[entry.wallet_id] = -entry.native;
  }

  if (mirrors.length > 0) {
    await base44.entities.WalletTransaction.bulkCreate(mirrors);
    for (const [walletId, delta] of Object.entries(deltaByWallet)) {
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) continue;
      await base44.entities.Wallet.update(walletId, {
        balance: (wallet.balance || 0) + delta,
      });
    }
  }

  // 2) Depósito de los nuevos pagos (saldos frescos tras el reverso)
  const freshWallets = await base44.entities.Wallet.list();
  const summary = derivePaymentSummary(payments);
  await depositSalePaymentsToWallets({
    payments,
    exchange_rate,
    sale_id: sale.id,
    wallets: freshWallets,
    notes: `${CORRECTION_NOTE_PREFIX} — nuevo método: ${summary.method}${operatorEmail ? ` — por ${operatorEmail}` : ''}`,
  });

  // Métodos sin billetera mapeada → el admin debe saberlo
  const unmapped = payments
    .filter(p => !freshWallets.some(
      w => w.is_active !== false && Array.isArray(w.payment_methods) && w.payment_methods.includes(p.method)
    ))
    .map(p => p.method);

  // 3) Actualizar la venta
  await base44.entities.Sale.update(sale.id, {
    payments,
    payment_method: summary.method,
    cash_amount: summary.cash,
    digital_amount: summary.digital,
    exchange_rate,
  });

  return { reversed: mirrors.length, unmapped };
}