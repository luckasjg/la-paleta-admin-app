import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, getSlackUserName } from '../../shared/slackChannel.ts';
import { parseConfirmationMessage } from '../../shared/refundOperationCode.ts';

// Canal #caja — sólo mensajes de este canal confirman devoluciones.
const CAJA_CHANNEL_ID = 'C0B6G2TQEJJ';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const event = body?.data?.event || {};

    if (event.channel !== CAJA_CHANNEL_ID) {
      return Response.json({ skipped: true, reason: 'canal no es #caja' });
    }

    const parsed = parseConfirmationMessage(event.text);
    if (!parsed) {
      return Response.json({ skipped: true, reason: 'el mensaje no trae código de operación y referencia' });
    }

    const matches = await base44.asServiceRole.entities.RefundRequest.filter({
      operation_code: parsed.code,
    });
    const refund = matches?.[0];
    if (!refund) {
      return Response.json({ skipped: true, reason: `no existe devolución con código ${parsed.code}` });
    }
    if (refund.status === 'pagada') {
      return Response.json({ skipped: true, reason: 'ya estaba pagada', refund_request_id: refund.id });
    }

    let confirmedBy = null;
    const token = await getSharedSlackToken(base44);
    if (token) confirmedBy = await getSlackUserName(token, event.user);

    await base44.asServiceRole.entities.RefundRequest.update(refund.id, {
      status: 'pagada',
      confirmed_at: new Date().toISOString(),
      confirmed_by_name: confirmedBy || 'Slack',
      confirmation_reference: parsed.reference,
    });

    return Response.json({
      ok: true,
      refund_request_id: refund.id,
      operation_code: parsed.code,
      reference: parsed.reference,
      confirmed_by: confirmedBy,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}