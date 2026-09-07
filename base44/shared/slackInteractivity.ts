// Utilidades para el endpoint de interactividad de Slack (Block Kit).

const encoder = new TextEncoder();

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verifica la firma v0 de Slack (HMAC-SHA256 sobre "v0:timestamp:body").
export async function verifySlackSignature(signingSecret, signature, timestamp, rawBody) {
  if (!signingSecret || !signature || !timestamp) return false;

  // Rechaza peticiones con más de 5 minutos (protección contra replay).
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`v0:${timestamp}:${rawBody}`));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(`v0=${hex}`, signature);
}

// Modal de registro de pago para una devolución.
export function buildPaymentModal(refundId, operationCode, amountLabel) {
  return {
    type: 'modal',
    callback_id: 'registrar_pago_devolucion',
    private_metadata: refundId,
    title: { type: 'plain_text', text: 'Registrar pago' },
    submit: { type: 'plain_text', text: 'Confirmar' },
    close: { type: 'plain_text', text: 'Cancelar' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Devolución *COD OP ${operationCode || '—'}* por *${amountLabel}*`,
        },
      },
      {
        type: 'input',
        block_id: 'bloque_referencia',
        label: { type: 'plain_text', text: 'Número de Referencia' },
        element: {
          type: 'plain_text_input',
          action_id: 'input_referencia',
          placeholder: { type: 'plain_text', text: 'Ej. 123456789' },
        },
      },
      {
        type: 'input',
        block_id: 'bloque_codigo',
        label: { type: 'plain_text', text: 'Código de Operación' },
        element: {
          type: 'plain_text_input',
          action_id: 'input_codigo',
          placeholder: { type: 'plain_text', text: 'Ej. 0001' },
        },
      },
    ],
  };
}