import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { getSharedSlackBotToken, getSlackUserName, updateMessage, openView } from '../../shared/slackChannel.ts';
import { verifySlackSignature, buildPaymentModal } from '../../shared/slackInteractivity.ts';
import { amountLabel, buildPaidBlocks, refundSummaryText } from '../../shared/refundSlackBlocks.ts';

// Endpoint público llamado por Slack (Interactivity & Shortcuts).
// No hay usuario de app: la autenticidad se valida con la firma de Slack.
export default async function (req: Request): Promise<Response> {
  try {
    const rawBody = await req.text();

    const valid = await verifySlackSignature(
      secrets.get('SLACK_SIGNING_SECRET'),
      req.headers.get('x-slack-signature'),
      req.headers.get('x-slack-request-timestamp'),
      rawBody,
    );
    if (!valid) return Response.json({ error: 'invalid signature' }, { status: 401 });

    // Slack envía la interactividad como form-encoded (campo "payload"),
    // pero el handshake de verificación llega como JSON plano.
    const params = new URLSearchParams(rawBody);
    const payload = params.get('payload')
      ? JSON.parse(params.get('payload'))
      : JSON.parse(rawBody || '{}');

    // Handshake al guardar la Request URL: devolver el challenge tal cual.
    if (payload.type === 'url_verification') {
      return Response.json({ challenge: payload.challenge });
    }

    const base44 = createClientFromRequest(req);
    const token = await getSharedSlackBotToken(base44);

    // a) Clic en el botón "Registrar Pago" → abrir el modal.
    if (payload.type === 'block_actions') {
      const action = (payload.actions || [])[0] || {};
      if (action.action_id !== 'abrir_modal_pago') return new Response('', { status: 200 });

      const refundId = action.value;
      const refund = await base44.asServiceRole.entities.RefundRequest.get(refundId).catch(() => null);
      if (!refund) return new Response('', { status: 200 });

      await openView(
        token,
        payload.trigger_id,
        buildPaymentModal(refundId, refund.operation_code, amountLabel(refund)),
      );
      return new Response('', { status: 200 });
    }

    // b) Envío del modal → marcar la devolución como pagada.
    if (payload.type === 'view_submission') {
      const view = payload.view || {};
      const refundId = view.private_metadata;
      const values = view.state?.values || {};
      const reference = values.bloque_referencia?.input_referencia?.value || '';
      const code = values.bloque_codigo?.input_codigo?.value || '';

      const refund = await base44.asServiceRole.entities.RefundRequest.get(refundId).catch(() => null);
      if (!refund) {
        return Response.json({
          response_action: 'errors',
          errors: { bloque_referencia: 'La devolución ya no existe en el sistema.' },
        });
      }
      if (refund.status === 'pagada') {
        return Response.json({
          response_action: 'errors',
          errors: { bloque_referencia: 'Esta devolución ya fue marcada como pagada.' },
        });
      }

      const slackName =
        (await getSlackUserName(token, payload.user?.id)) || payload.user?.name || payload.user?.id || 'Slack';

      await base44.asServiceRole.entities.RefundRequest.update(refundId, {
        status: 'pagada',
        confirmation_reference: reference,
        operation_code: code || refund.operation_code,
        confirmed_at: new Date().toISOString(),
        confirmed_by_name: slackName,
      });

      if (refund.slack_channel && refund.slack_message_ts) {
        await updateMessage(
          token,
          refund.slack_channel,
          refund.slack_message_ts,
          refundSummaryText(refund, code || refund.operation_code),
          buildPaidBlocks(
            refund,
            refund.operation_code,
            refund.staff_name,
            slackName,
            reference || '—',
            code || refund.operation_code || '—',
          ),
        );
      }

      return Response.json({ response_action: 'clear' });
    }

    return new Response('', { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}