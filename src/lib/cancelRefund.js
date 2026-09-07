import { base44 } from '@/api/base44Client';

const amountLabel = (r) => (r.currency === 'VES'
  ? `Bs. ${(r.amount_native || 0).toFixed(2)}`
  : `$${(r.amount_native || 0).toFixed(2)}`);

/**
 * Marca una devolución pendiente como cancelada (se conserva como respaldo) y
 * avisa en #caja de Slack para que el operador de pagos no envíe el dinero.
 */
export async function cancelRefund(refund, reason) {
  await base44.entities.RefundRequest.update(refund.id, {
    status: 'cancelada',
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason || '',
  });
  await base44.functions.invoke('notifySlackRefundCancelled', {
    operation_code: refund.operation_code || '',
    method: refund.method,
    titular: refund.customer_data?.titular || '',
    amount_label: amountLabel(refund),
    reason: reason || '',
  });
}

/** Cancela todas las devoluciones pendientes vinculadas a una venta. */
export async function cancelPendingRefundsForSale(saleId, reason) {
  if (!saleId) return 0;
  const pending = await base44.entities.RefundRequest.filter({ sale_id: saleId, status: 'pendiente' });
  for (const refund of pending) {
    await cancelRefund(refund, reason);
  }
  return pending.length;
}