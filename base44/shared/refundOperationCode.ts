// Código de operación consecutivo para devoluciones (0001, 0002, ...).
// El contador vive en ShopSetting con la key 'refund_operation_counter'.

const COUNTER_KEY = 'refund_operation_counter';

export function formatOperationCode(n) {
  return String(n).padStart(4, '0');
}

// Devuelve el próximo código consecutivo, incrementando el contador guardado.
export async function nextOperationCode(base44) {
  const rows = await base44.asServiceRole.entities.ShopSetting.filter({ key: COUNTER_KEY });
  const current = rows?.[0];
  const next = (parseInt(current?.value, 10) || 0) + 1;

  if (current) {
    await base44.asServiceRole.entities.ShopSetting.update(current.id, { value: String(next) });
  } else {
    await base44.asServiceRole.entities.ShopSetting.create({ key: COUNTER_KEY, value: String(next) });
  }

  return formatOperationCode(next);
}

// Extrae el código de operación y el n° de referencia de un mensaje de Slack.
// Ej: "cod op: 0001 ref: 123456" → { code: '0001', reference: '123456' }
export function parseConfirmationMessage(text) {
  const t = (text || '').toLowerCase();
  const codeMatch = t.match(/c[oó]d[a-zó]*\.?\s*op[a-zó]*\.?\s*[:#-]?\s*(\d{1,8})/);
  const refMatch = t.match(/ref[a-zó]*\.?\s*[:#-]?\s*(\d{3,24})/);
  if (!codeMatch || !refMatch) return null;
  return {
    code: formatOperationCode(parseInt(codeMatch[1], 10)),
    reference: refMatch[1],
  };
}