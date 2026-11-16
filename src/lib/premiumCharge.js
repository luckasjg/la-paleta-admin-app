import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { EUR_PER_USD } from '@/lib/useExchangeRate';
import { depositSalePaymentsToWallets, withdrawChangeTramos } from '@/lib/walletHelpers';
import { isDigitalMethod, aggregateChangeFields } from '@/lib/changeTramos';

export const chargeLabel = (c) => c.customer_name || `Ticket #${c.ticket_number ?? c.sale_id?.slice(-4)}`;

const shiftNow = () => {
  const h = moment().hour();
  return h < 12 ? 'manana' : h < 18 ? 'tarde' : 'noche';
};

/** Cobra un recargo premium pendiente como una venta propia dentro de la caja activa. */
export async function payPremiumCharge({ charge, session, payments, exchange_rate, changeBreakdown, wallets }) {
  const breakdown = changeBreakdown || [];
  if (breakdown.some((t) => isDigitalMethod(t.method))) {
    throw new Error('Para cobrar recargos entrega el vuelto en efectivo.');
  }
  const amount = charge.amount_usd;
  const isCash = (m) => m === 'efectivo_usd' || m === 'efectivo_ves';
  const sum = (arr) => +arr.reduce((s, p) => s + (p.amount_usd_equivalent || 0), 0).toFixed(2);
  const count = await base44.entities.Sale.count({ cash_register_id: session.id });

  const sale = await base44.entities.Sale.create({
    dispatch_status: 'despachado',
    ticket_number: count + 1,
    ...(charge.customer_id ? { customer_id: charge.customer_id, customer_name: charge.customer_name, customer_cedula: charge.customer_cedula } : {}),
    items: [{
      product_name: `Recargo premium · Ticket #${charge.ticket_number ?? ''} ${charge.flavors_detail ? `(${charge.flavors_detail})` : ''}`.trim(),
      category: 'recargo',
      quantity: 1,
      unit_price: amount,
      subtotal: amount,
      unit_price_eur: +(amount * EUR_PER_USD).toFixed(2),
      subtotal_eur: +(amount * EUR_PER_USD).toFixed(2),
    }],
    total: amount,
    total_eur: +(amount * EUR_PER_USD).toFixed(2),
    exchange_rate,
    exchange_rate_eur_ves: exchange_rate,
    payments,
    payment_method: payments.length > 1 ? 'mixto' : payments[0]?.method,
    cash_amount: sum(payments.filter((p) => isCash(p.method))),
    digital_amount: sum(payments.filter((p) => !isCash(p.method))),
    sale_date: new Date().toISOString(),
    shift: shiftNow(),
    cash_register_id: session.id,
    staff_id: session.staff_id,
    staff_name: session.staff_name,
    ...aggregateChangeFields(breakdown),
  });

  await base44.entities.PremiumSurchargeCharge.update(charge.id, {
    status: 'cobrado',
    paid_sale_id: sale.id,
    paid_cash_register_id: session.id,
    resolved_at: new Date().toISOString(),
    resolved_by: session.staff_name,
  });

  await depositSalePaymentsToWallets({ payments, exchange_rate, sale_id: sale.id, wallets });
  if (breakdown.length) await withdrawChangeTramos({ breakdown, exchange_rate, sale_id: sale.id, wallets });
}