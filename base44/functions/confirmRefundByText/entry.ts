import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getSharedSlackBotToken,
  getSlackUserName,
  postToChannel,
  updateMessage,
} from '../../shared/slackChannel.ts';
import { buildPaidBlocks, refundSummaryText } from '../../shared/refundSlackBlocks.ts';

const BOT_IDENTITY = { username: 'La Paleta', icon_emoji: ':ice_cream:' };

// Confirma una devolución cuando un cajero escribe "NNNN REFERENCIA" en #caja.
// Lo invoca el workflow "Slack — Confirmar devolución por texto".
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const event = body?.data?.event || {};
    const text = (event.text || '').trim();
    const channel = event.channel;
    const threadTs = event.thread_ts || event.ts;

    const match = text.match(/^(\d{4})\s+(\S+)/);
    if (!match) return Response.json({ skipped: true, reason: 'formato no reconocido' });

    const [, operationCode, reference] = match;
    const token = await getSharedSlackBotToken(base44);
    if (!token) return Response.json({ skipped: true, reason: 'no slack bot token' });

    const reply = (msg: string) =>
      postToChannel(token, channel, msg, undefined, { ...BOT_IDENTITY, thread_ts: threadTs });

    const matches = await base44.asServiceRole.entities.RefundRequest.filter({
      operation_code: operationCode,
    });
    const refund = (matches || [])[0];

    if (!refund) {
      await reply(`❌ No existe ninguna devolución con el código *${operationCode}*.`);
      return Response.json({ ok: false, reason: 'not found' });
    }
    if (refund.status === 'pagada') {
      await reply(
        `❌ La devolución *${operationCode}* ya estaba marcada como pagada` +
          `${refund.confirmation_reference ? ` (Ref: ${refund.confirmation_reference})` : ''}.`,
      );
      return Response.json({ ok: false, reason: 'already paid' });
    }
    if (refund.status === 'cancelada') {
      await reply(`❌ La devolución *${operationCode}* fue cancelada, no se puede pagar.`);
      return Response.json({ ok: false, reason: 'cancelled' });
    }

    const slackName = (await getSlackUserName(token, event.user)) || 'Slack';

    await base44.asServiceRole.entities.RefundRequest.update(refund.id, {
      status: 'pagada',
      confirmation_reference: reference,
      confirmed_at: new Date().toISOString(),
      confirmed_by_name: slackName,
    });

    await reply(
      `✅ Devolución *${operationCode}* marcada como pagada. Referencia: *${reference}* · Registrado por ${slackName}.`,
    );

    // Actualiza el mensaje original de la devolución para reflejar el pago.
    if (refund.slack_channel && refund.slack_message_ts) {
      await updateMessage(
        token,
        refund.slack_channel,
        refund.slack_message_ts,
        refundSummaryText(refund, operationCode),
        buildPaidBlocks(refund, operationCode, refund.staff_name, slackName, reference, operationCode),
      ).catch(() => null);
    }

    return Response.json({ ok: true, refund_request_id: refund.id, reference });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}