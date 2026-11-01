import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSharedSlackToken, resolveChannelId, postToChannel } from '../../shared/slackChannel.ts';

const CHANNEL = 'general';

// Publica en Slack la lista de bandejas nuevas y rellenadas del día indicado.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    const { date } = await req.json().catch(() => ({}));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return Response.json({ error: 'invalid date' }, { status: 400 });

    const events = await base44.asServiceRole.entities.TrayEvent.filter(
      { date, type: { $in: ['nueva', 'relleno'] } }, 'created_date', 500,
    );
    const list = Array.isArray(events) ? events : events.items || [];
    if (!list.length) return Response.json({ skipped: true });

    const line = (e) => `• ${e.recipe_name} — ${Math.round(e.grams || 0)}g${e.type === 'relleno' ? ` (quedó en ${Math.round(e.remaining_after || 0)}g)` : ''}`;
    const nuevas = list.filter(e => e.type === 'nueva');
    const rellenos = list.filter(e => e.type === 'relleno');
    const text = [
      `:icecream: *Producción del ${date}*`,
      `*Bandejas nuevas (${nuevas.length})*`, ...(nuevas.length ? nuevas.map(line) : ['—']),
      `*Bandejas rellenadas (${rellenos.length})*`, ...(rellenos.length ? rellenos.map(line) : ['—']),
    ].join('\n');

    const token = await getSharedSlackToken(base44);
    if (!token) return Response.json({ skipped: true, reason: 'no slack connection' });
    await postToChannel(token, await resolveChannelId(token, CHANNEL), text);
    return Response.json({ ok: true, count: list.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}