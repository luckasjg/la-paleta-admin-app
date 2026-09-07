// Utilidades compartidas para postear en Slack usando la conexión compartida
// (shared connector del builder), disponible también en automatizaciones.

export async function getSharedSlackToken(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('slack');
  return conn?.accessToken;
}

// Token del bot ("Slack La Paleta Bot"). Necesario para Block Kit interactivo:
// views.open sólo acepta tokens de bot (xoxb-).
export async function getSharedSlackBotToken(base44) {
  const conn = await base44.asServiceRole.connectors.getConnection('slackbot');
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

// Resuelve el nombre legible de un usuario de Slack a partir de su ID.
export async function getSlackUserName(accessToken, userId) {
  if (!userId) return null;
  const url = new URL('https://slack.com/api/users.info');
  url.searchParams.set('user', userId);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!data.ok) return null;
  return data.user?.profile?.real_name || data.user?.real_name || data.user?.name || null;
}

export async function postToChannel(accessToken, channelId, text, blocks, identity) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: channelId, text, ...(blocks ? { blocks } : {}), ...(identity || {}) }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`slack chat.postMessage: ${data.error}`);
  return data;
}

// Reemplaza el contenido de un mensaje ya publicado.
export async function updateMessage(accessToken, channelId, ts, text, blocks) {
  const res = await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: channelId, ts, text, ...(blocks ? { blocks } : {}) }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`slack chat.update: ${data.error}`);
  return data;
}

// Abre un modal a partir de un trigger_id de interactividad.
export async function openView(accessToken, triggerId, view) {
  const res = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ trigger_id: triggerId, view }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`slack views.open: ${data.error}`);
  return data;
}