// Utilidades compartidas para postear en Slack usando la conexión compartida
// (shared connector del builder), disponible también en automatizaciones.

export async function getSharedSlackToken(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('slack');
  return conn?.accessToken;
}

// Resuelve el ID de un canal por nombre (Slack pagina de a 200).
export async function resolveChannelId(accessToken, channelName) {
  let cursor;
  do {
    const url = new URL('https://slack.com/api/conversations.list');
    url.searchParams.set('types', 'public_channel');
    url.searchParams.set('limit', '200');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!data.ok) throw new Error(`slack conversations.list: ${data.error}`);

    const found = (data.channels || []).find((c) => c.name === channelName);
    if (found) return found.id;
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);

  throw new Error(`canal #${channelName} no encontrado`);
}

export async function postToChannel(accessToken, channelId, text) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`slack chat.postMessage: ${data.error}`);
  return data;
}