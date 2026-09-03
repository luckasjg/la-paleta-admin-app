import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, getSlackUserName } from '../../shared/slackChannel.ts';

// Canal #caja de Slack — sólo reacciones en este canal confirman devoluciones.
const CAJA_CHANNEL_ID = 'C0B6G2TQEJJ';
const TRIGGER_REACTION = 'white_check_mark';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const channel = body?.channel;
    const messageTs = body?.message_ts;
    const reaction = (body?.reaction || '').replace(/^:|:$/g, '');
    const slackUserId = body?.user;

    if (channel !== CAJA_CHANNEL_ID) {
      return Response.json({ skipped: true, reason: 'canal no es #caja' });
    }
    if (reaction !== TRIGGER_REACTION) {
      return Response.json({ skipped: true, reason: 'emoji no es ✅' });
    }
    if (!messageTs) {
      return Response.json({ skipped: true, reason: 'sin message_ts' });
    }

    const matches = await base44.asServiceRole.entities.RefundRequest.filter({
      slack_message_ts: messageTs,
    });
    const refund = matches?.[0];
    if (!refund) {
      return Response.json({ skipped: true, reason: 'no hay devolución para ese mensaje' });
    }
    if (refund.status === 'pagada') {
      return Response.json({ skipped: true, reason: 'ya estaba pagada', refund_request_id: refund.id });
    }

    let confirmedBy = null;
    const token = await getSharedSlackToken(base44);
    if (token) confirmedBy = await getSlackUserName(token, slackUserId);

    await base44.asServiceRole.entities.RefundRequest.update(refund.id, {
      status: 'pagada',
      confirmed_at: new Date().toISOString(),
      confirmed_by_name: confirmedBy || 'Slack',
    });

    return Response.json({ ok: true, refund_request_id: refund.id, confirmed_by: confirmedBy });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}