import { base44 } from '@/api/base44Client';

export const REVERSAL_NOTE_PREFIX = 'Reversión por anulación de venta';

/**
 * Revierte los movimientos de billetera de una venta anulada.
 *
 * - sale_income  → crea un movimiento espejo negativo (el dinero nunca entró)
 * - change_given → crea un movimiento espejo positivo (el vuelto vuelve a la billetera)
 *
 * Idempotente: si ya existe un movimiento de reversión para esta venta
 * (nota que empieza por REVERSAL_NOTE_PREFIX) no vuelve a aplicarla.
 *
 * skipChangeReversal = true cuando la devolución digital YA fue pagada al
 * cliente (el dinero salió de verdad, no debe volver a la billetera).
 */
export async function reverseSaleWalletMovements({ saleId, skipChangeReversal = false, reason = '' }) {
  if (!saleId) return { reversed: 0 };

  // Snapshots frescos — nunca caché
  const txs = await base44.entities.WalletTransaction.filter({ sale_id: saleId });
  if (txs.length === 0) return { reversed: 0 };

  const alreadyReversed = txs.some(t => (t.notes || '').startsWith(REVERSAL_NOTE_PREFIX));
  if (alreadyReversed) return { reversed: 0, alreadyReversed: true };

  const wallets = await base44.entities.Wallet.list();
  const originals = txs.filter(t => t.type === 'sale_income' || t.type === 'change_given');

  const deltaByWallet = {};
  const mirrors = [];

  for (const t of originals) {
    if (t.type === 'change_given' && skipChangeReversal) continue;
    const amountNative = -(t.amount_native || 0);
    if (!amountNative) continue;

    mirrors.push({
      wallet_id: t.wallet_id,
      wallet_name: t.wallet_name,
      type: 'manual_adjust',
      amount_native: amountNative,
      amount_usd_equivalent: -(t.amount_usd_equivalent || 0),
      exchange_rate: t.exchange_rate,
      sale_id: saleId,
      linked_transaction_id: t.id,
      notes: `${REVERSAL_NOTE_PREFIX} ${saleId} (${t.type})${reason ? ` — ${reason}` : ''}`,
      transaction_date: new Date().toISOString(),
    });
    deltaByWallet[t.wallet_id] = (deltaByWallet[t.wallet_id] || 0) + amountNative;
  }

  if (mirrors.length === 0) return { reversed: 0 };

  await base44.entities.WalletTransaction.bulkCreate(mirrors);

  for (const [walletId, delta] of Object.entries(deltaByWallet)) {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) continue;
    await base44.entities.Wallet.update(walletId, {
      balance: (wallet.balance || 0) + delta,
    });
  }

  return { reversed: mirrors.length };
}