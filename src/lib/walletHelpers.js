import { base44 } from '@/api/base44Client';

/**
 * Busca la billetera mapeada a un método de pago.
 * Retorna la primera billetera activa cuyo payment_methods incluya el método.
 */
export function findWalletForMethod(wallets, method) {
  return wallets.find(
    w => w.is_active !== false && Array.isArray(w.payment_methods) && w.payment_methods.includes(method)
  );
}

/**
 * Deposita los pagos de una venta en sus billeteras correspondientes.
 * - payments: array de { method, amount_usd, amount_ves, amount_usd_equivalent }
 * - exchange_rate: tasa histórica de la venta
 * - sale_id: ID de la venta recién creada
 * - wallets: lista de billeteras (para mapear método→billetera)
 *
 * Por cada pago crea un WalletTransaction y actualiza el balance de la billetera.
 * Si no encuentra billetera mapeada para un método, lo ignora silenciosamente
 * (la venta NO debe fallar por billeteras no configuradas).
 */
export async function depositSalePaymentsToWallets({ payments, exchange_rate, sale_id, wallets }) {
  if (!Array.isArray(payments) || payments.length === 0) return;

  for (const payment of payments) {
    const wallet = findWalletForMethod(wallets, payment.method);
    if (!wallet) continue;

    // Monto en moneda nativa de la billetera
    let amountNative = 0;
    if (wallet.currency === 'USD') {
      amountNative = payment.amount_usd || payment.amount_usd_equivalent || 0;
    } else {
      // VES
      amountNative = payment.amount_ves || ((payment.amount_usd_equivalent || 0) * exchange_rate);
    }
    if (!(amountNative > 0)) continue;

    const amountUsdEq = payment.amount_usd_equivalent || 0;

    // 1) Registrar transacción
    await base44.entities.WalletTransaction.create({
      wallet_id: wallet.id,
      wallet_name: wallet.name,
      type: 'sale_income',
      amount_native: amountNative,
      amount_usd_equivalent: amountUsdEq,
      exchange_rate,
      sale_id,
      transaction_date: new Date().toISOString(),
    });

    // 2) Actualizar saldo
    await base44.entities.Wallet.update(wallet.id, {
      balance: (wallet.balance || 0) + amountNative,
    });
  }
}