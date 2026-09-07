import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackBotToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';

// Identidad visible del bot al publicar en #caja.
const BOT_IDENTITY = { username: 'La Paleta', icon_emoji: ':ice_cream:' };
import { nextOperationCode } from '../../shared/refundOperationCode.ts';
import { buildRefundBlocks, refundSummaryText } from '../../shared/refundSlackBlocks.ts';

const CHANNEL_NAME = 'caja';

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

    const operationCode = refund.operation_code || (await nextOperationCode(base44));
    const staffName = refund.staff_name || user.full_name || '—';

    // Token de bot: el mensaje debe pertenecer al bot para poder abrir el modal
    // y actualizar el mensaje al confirmar el pago.
    const token = await getSharedSlackBotToken(base44);
    if (!token) return Response.json({ skipped: true, reason: 'no slack bot token' });

    const channelId = await resolveChannelId(token, CHANNEL_NAME);
    const posted = await postToChannel(
      token,
      channelId,
      refundSummaryText(refund, operationCode),
      buildRefundBlocks(refund, operationCode, staffName),
      BOT_IDENTITY,
    );

    await base44.asServiceRole.entities.RefundRequest.update(refundId, {
      slack_notified: true,
      slack_message_ts: posted?.ts || undefined,
      slack_channel: posted?.channel || channelId,
      operation_code: operationCode,
    });

    return Response.json({ ok: true, refund_request_id: refundId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}