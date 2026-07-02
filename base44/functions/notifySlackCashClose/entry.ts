import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '6a18ea9c0da9a2b27b53e4c2';
const CHANNEL_NAME = 'caja';

const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const shiftLabel = (s) =>
  s === 'manana' ? 'Mañana' : s === 'tarde' ? 'Tarde' : s === 'noche' ? 'Noche' : (s || '—');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // El payload viene del entity automation: { event, data: <CashRegister> }
    // Nunca confiar en body.data: siempre re-consultar el registro desde la DB
    // usando el entity_id verificado del evento para evitar falsificación.
    const entityId = body?.event?.entity_id;
    if (!entityId) {
      return Response.json({ skipped: true, reason: 'missing entity_id' });
    }
    const register = await base44.asServiceRole.entities.CashRegister.get(entityId);
    if (!register || register.status !== 'cerrada') {
      return Response.json({ skipped: true, reason: 'no register or not closed' });
    }

    // Obtener el connection del usuario que creó el cierre (operador).
    // Si el operador no ha conectado su Slack, salimos silenciosamente.
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn?.accessToken;
    } catch (_) {
      return Response.json({ skipped: true, reason: 'operator has no slack connection' });
    }
    if (!accessToken) {
      return Response.json({ skipped: true, reason: 'no access token' });
    }

    // Resolver ID del canal #caja (paginado)
    let channelId = null;
    let cursor;
    do {
      const url = new URL('https://slack.com/api/conversations.list');
      url.searchParams.set('types', 'public_channel,private_channel');
      url.searchParams.set('limit', '200');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!data.ok) {
        return Response.json({ error: 'slack conversations.list failed', details: data.error }, { status: 500 });
      }
      const found = (data.channels || []).find((c) => c.name === CHANNEL_NAME);
      if (found) { channelId = found.id; break; }
      cursor = data.response_metadata?.next_cursor || '';
    } while (cursor);

    if (!channelId) {
      return Response.json({ error: `channel #${CHANNEL_NAME} not found` }, { status: 404 });
    }

    const diff = Number(register.difference) || 0;
    const diffEmoji = diff === 0 ? '✅' : diff < 0 ? '🔻' : '🔺';
    const diffText = `${diff > 0 ? '+' : ''}${fmtMoney(diff).replace('$', '$')}`;

    const text = `🧾 *Cierre de Caja* — ${register.date} · ${shiftLabel(register.shift)}\n` +
      `👤 Operario: ${register.operator || '—'}\n` +
      `💵 Total ventas: *${fmtMoney(register.total_sales)}*  ·  🧮 N° ventas: *${register.sales_count ?? 0}*\n` +
      `💰 Efectivo sistema: ${fmtMoney(register.system_cash)}  ·  Declarado: ${fmtMoney(register.declared_cash)}\n` +
      `${diffEmoji} Diferencia: *${diffText}*` +
      (register.notes ? `\n📝 _${register.notes}_` : '');

    const post = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel: channelId, text }),
    });
    const postData = await post.json();
    if (!postData.ok) {
      return Response.json({ error: 'slack postMessage failed', details: postData.error }, { status: 500 });
    }

    return Response.json({ ok: true, channel: CHANNEL_NAME, register_id: register.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});