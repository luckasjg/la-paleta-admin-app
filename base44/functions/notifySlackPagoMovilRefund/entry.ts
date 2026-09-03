import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';

const CHANNEL_NAME = 'caja';

const methodLabel = (m) => (m === 'transferencia' ? 'Transferencia' : 'Pago Móvil');
const accountLabel = (t) =>
  t === 'ahorro' ? 'Ahorro' : t === 'corriente' ? 'Corriente' : t === 'pago_movil' ? 'Pago Móvil' : '—';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Sólo un usuario autenticado del app puede disparar la notificación.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const refundId = body?.refund_request_id;
    if (!refundId) return Response.json({ error: 'refund_request_id requerido' }, { status: 400 });

    // Nunca confiar en el payload: releer el registro desde la DB.
    const refund = await base44.asServiceRole.entities.RefundRequest.get(refundId);
    if (!refund) return Response.json({ skipped: true, reason: 'refund not found' });
    if (refund.slack_notified) return Response.json({ skipped: true, reason: 'already notified' });

    const c = refund.customer_data || {};
    const money = refund.currency === 'VES'
      ? `Bs. ${(Number(refund.amount_native) || 0).toFixed(2)}`
      : `$${(Number(refund.amount_native) || 0).toFixed(2)}`;

    const text =
      `💸 *Devolución por ${methodLabel(refund.method)}* — pendiente de procesar\n` +
      `*Monto:* ${money}  (≈ $${(Number(refund.amount_usd_equivalent) || 0).toFixed(2)})\n` +
      `*Titular:* ${c.titular || '—'}  ·  *C.I.:* ${c.cedula || '—'}\n` +
      `*Banco:* ${c.banco || '—'}  ·  *Tipo:* ${accountLabel(c.tipo_cuenta)}\n` +
      `*Cuenta:* ${c.numero_cuenta || '—'}  ·  *Teléfono:* ${c.telefono || '—'}\n` +
      `*Sale de:* ${refund.wallet_name || '—'}\n` +
      `*Motivo:* ${refund.reference || '—'}\n` +
      `*Cajero:* ${refund.staff_name || user.full_name || '—'}\n` +
      `_Al enviar el dinero, márcala como pagada en el POS → Devoluciones._`;

    const token = await getSharedSlackToken(base44);
    if (!token) return Response.json({ skipped: true, reason: 'no slack token' });

    const channelId = await resolveChannelId(token, CHANNEL_NAME);
    await postToChannel(token, channelId, text);

    await base44.asServiceRole.entities.RefundRequest.update(refundId, { slack_notified: true });

    return Response.json({ ok: true, refund_request_id: refundId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}