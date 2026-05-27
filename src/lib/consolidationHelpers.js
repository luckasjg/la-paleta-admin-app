import { base44 } from '@/api/base44Client';

/**
 * Consolida (vacía) el saldo de una billetera dejándolo en 0 y genera un
 * registro de auditoría en WalletConsolidation.
 *
 * @param {Object} params
 * @param {Object} params.wallet - Billetera a consolidar (objeto Wallet completo)
 * @param {number} params.amountNative - Monto en moneda nativa que se está retirando
 * @param {string} params.destination - Destino físico del fondo
 * @param {number} params.exchangeRate - Tasa USD→VES vigente
 * @param {string} params.source - 'manual' | 'cash_register_close'
 * @param {string} [params.cashRegisterId] - ID del cierre (si aplica)
 * @param {string} [params.closedBy] - email/nombre del operario
 * @param {string} [params.notes] - Observaciones
 * @returns {Promise<Object>} El registro WalletConsolidation creado
 */
export async function consolidateWallet({
  wallet,
  amountNative,
  destination,
  exchangeRate,
  source = 'manual',
  cashRegisterId,
  closedBy,
  notes,
}) {
  if (!wallet?.id) throw new Error('Billetera inválida');
  if (!destination || !destination.trim()) throw new Error('Destino requerido');

  const rate = Number(exchangeRate) > 0 ? Number(exchangeRate) : 1;
  const amount = Math.max(0, Number(amountNative) || 0);

  // Calcular equivalentes según moneda nativa
  let amount_usd = 0;
  let amount_ves = 0;
  if (wallet.currency === 'USD') {
    amount_usd = amount;
    amount_ves = amount * rate;
  } else {
    amount_ves = amount;
    amount_usd = rate > 0 ? amount / rate : 0;
  }

  // 1. Crear el registro de consolidación (auditoría)
  const record = await base44.entities.WalletConsolidation.create({
    date: new Date().toISOString(),
    wallet_id: wallet.id,
    wallet_name: wallet.name,
    wallet_currency: wallet.currency,
    amount_native: amount,
    amount_usd: parseFloat(amount_usd.toFixed(4)),
    amount_ves: parseFloat(amount_ves.toFixed(2)),
    exchange_rate: rate,
    destination: destination.trim(),
    source,
    cash_register_id: cashRegisterId,
    closed_by: closedBy || '',
    notes: notes || '',
  });

  // 2. Crear movimiento contraparte en WalletTransaction (salida) para que
  //    el historial de la billetera muestre la liquidación.
  try {
    await base44.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      wallet_name: wallet.name,
      type: 'manual_adjust',
      amount_native: -amount, // negativo = salida
      amount_usd_equivalent: -amount_usd,
      exchange_rate: rate,
      notes: `Consolidación → ${destination.trim()}`,
      transaction_date: new Date().toISOString(),
    });
  } catch (_) {
    // No bloqueamos el flujo si la tx falla: la consolidación queda igualmente registrada.
  }

  // 3. Resetear el saldo de la billetera a 0
  await base44.entities.Wallet.update(wallet.id, {
    balance: 0,
    historical_usd_value: 0,
  });

  return record;
}