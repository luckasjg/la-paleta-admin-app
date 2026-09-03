import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';

const CHANNEL_NAME = 'caja';

const methodLabel = (m) => (m === 'transferencia' ? 'Transferencia' : 'Pago Móvil');

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = String(body?.operation_code || '').slice(0, 12);
    const titular = String(body?.titular || '').slice(0, 120);
    const amount = String(body?.amount_label || '').slice(0, 40);
    const reason = String(body?.reason || '').slice(0, 300);

    const text =
      `🚫 *DEVOLUCIÓN CANCELADA — NO ENVIAR EL DINERO*\n` +
      `*COD OP: ${code || '—'}*  ·  ${methodLabel(body?.method)}\n` +
      `*Monto:* ${amount || '—'}  ·  *Titular:* ${titular || '—'}\n` +
      `*Motivo:* ${reason || '—'}\n` +
      `*Cancelada por:* ${user.full_name || user.email || '—'}`;

    const token = await getSharedSlackToken(base44);
    if (!token) return Response.json({ skipped: true, reason: 'no slack token' });

    const channelId = await resolveChannelId(token, CHANNEL_NAME);
    await postToChannel(token, channelId, text);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}