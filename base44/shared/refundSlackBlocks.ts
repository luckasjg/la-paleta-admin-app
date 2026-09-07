// Bloques de Block Kit para el mensaje de devolución en #caja.

const methodLabel = (m) => (m === 'transferencia' ? 'Transferencia' : 'Pago Móvil');
const accountLabel = (t) =>
  t === 'ahorro' ? 'Ahorro' : t === 'corriente' ? 'Corriente' : t === 'pago_movil' ? 'Pago Móvil' : '—';

export function amountLabel(refund) {
  const n = Number(refund?.amount_native) || 0;
  return refund?.currency === 'VES' ? `Bs. ${n.toFixed(2)}` : `$${n.toFixed(2)}`;
}

// Texto plano de respaldo (notificaciones y clientes sin Block Kit).
export function refundSummaryText(refund, operationCode) {
  return `💸 Devolución por ${methodLabel(refund.method)} — COD OP ${operationCode} — ${amountLabel(refund)}`;
}

// Mensaje con datos de la devolución + botón "Registrar Pago".
export function buildRefundBlocks(refund, operationCode, staffName) {
  const c = refund.customer_data || {};
  const details =
    `💸 *Devolución por ${methodLabel(refund.method)}* — pendiente de procesar\n` +
    `*COD OP:* ${operationCode}   ·   *ID:* ${refund.id}\n` +
    `*Monto:* ${amountLabel(refund)}  (≈ $${(Number(refund.amount_usd_equivalent) || 0).toFixed(2)})\n` +
    `*Titular:* ${c.titular || '—'}  ·  *C.I.:* ${c.cedula || '—'}\n` +
    `*Banco:* ${c.banco || '—'}  ·  *Tipo:* ${accountLabel(c.tipo_cuenta)}\n` +
    `*Cuenta:* ${c.numero_cuenta || '—'}  ·  *Teléfono:* ${c.telefono || '—'}\n` +
    `*Sale de:* ${refund.wallet_name || '—'}\n` +
    `*Motivo:* ${refund.reference || '—'}\n` +
    `*Cajero:* ${staffName || '—'}`;

  return [{ type: 'section', text: { type: 'mrkdwn', text: details } }];
}