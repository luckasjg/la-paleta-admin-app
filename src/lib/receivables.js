import { base44 } from '@/api/base44Client';
import { EUR_PER_USD } from '@/lib/useExchangeRate';
import { depositSalePaymentsToWallets } from '@/lib/walletHelpers';

export const CASH_METHODS = ['efectivo_usd', 'efectivo_ves'];

// Saldo pendiente total de un cliente (USD base).
export async function getCustomerDebt(customerId) {
  const res = await base44.entities.AccountReceivable.aggregate({
    query: { customer_id: customerId, status: 'pendiente' },
    sum: ['balance_usd'],
  });
  return res?.rows?.[0]?.sum_balance_usd || 0;
}

// Convierte un monto en su moneda a USD base.
export function toUsdBase(amount, currency, eurVes) {
  if (!(amount > 0)) return 0;
  if (currency === 'USD') return amount;
  if (currency === 'EUR') return amount / EUR_PER_USD;
  return eurVes > 0 ? amount / eurVes / EUR_PER_USD : 0;
}

/**
 * Registra un abono de un cliente: lo aplica a sus deudas pendientes (la más
 * antigua primero), lo vincula a la sesión de caja abierta y deposita el dinero
 * en la billetera del método.
 */
export async function registerAbono({ customer, method, currency, amount, eurVes, session, wallets, notes }) {
  if (!session?.id) throw new Error('No hay sesión de caja abierta. Abre la caja para recibir abonos.');
  const usd = +toUsdBase(amount, currency, eurVes).toFixed(2);
  if (!(usd > 0)) throw new Error('Monto inválido');

  const { items: pending } = await base44.entities.AccountReceivable.filter(
    { customer_id: customer.id, status: 'pendiente' },
    { sort: 'sale_date', limit: 500 }
  );
  const debt = pending.reduce((s, r) => s + (r.balance_usd || 0), 0);
  if (usd > debt + 0.005) throw new Error(`El abono supera la deuda ($${debt.toFixed(2)})`);

  let left = usd;
  const allocations = [];
  const updates = [];
  for (const r of pending) {
    if (left <= 0.005) break;
    const applied = Math.min(left, r.balance_usd || 0);
    const balance = +((r.balance_usd || 0) - applied).toFixed(2);
    allocations.push({ receivable_id: r.id, amount_usd: +applied.toFixed(2) });
    updates.push({
      id: r.id,
      paid_usd: +((r.paid_usd || 0) + applied).toFixed(2),
      balance_usd: balance <= 0.005 ? 0 : balance,
      status: balance <= 0.005 ? 'saldada' : 'pendiente',
      ...(balance <= 0.005 ? { settled_at: new Date().toISOString() } : {}),
    });
    left -= applied;
  }
  if (updates.length) await base44.entities.AccountReceivable.bulkUpdate(updates);

  const payment = await base44.entities.ReceivablePayment.create({
    customer_id: customer.id,
    customer_name: customer.full_name,
    method, currency,
    amount_native: +amount.toFixed(2),
    amount_usd_equivalent: usd,
    exchange_rate: eurVes,
    allocations,
    cash_register_id: session.id,
    staff_name: session.staff_name,
    payment_date: new Date().toISOString(),
    ...(notes ? { notes } : {}),
  });

  const p = { method, amount_usd_equivalent: usd };
  if (currency === 'EUR') p.amount_eur = +amount.toFixed(2);
  else if (currency === 'USD') p.amount_usd = +amount.toFixed(2);
  else p.amount_ves = +amount.toFixed(2);
  await depositSalePaymentsToWallets({
    payments: [p], exchange_rate: eurVes, wallets,
    notes: `Abono cuenta por cobrar — ${customer.full_name}`,
  });
  return payment;
}

// Marca como liquidadas todas las deudas pendientes de un cliente (sin ingreso de dinero).
export async function settleCustomer(customerId, note) {
  await base44.entities.AccountReceivable.updateMany(
    { customer_id: customerId, status: 'pendiente' },
    { $set: { status: 'saldada', balance_usd: 0, settled_at: new Date().toISOString(), settle_note: note || 'Liquidada manualmente' } }
  );
}