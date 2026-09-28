// Extrae bloques de cifras emitidos por el asesor como ```cifras { ... } ```
// Formato: { "titulo": "...", "items": [{ "label": "...", "value": "...", "detalle": "..." }], "fuente": "..." }

const BLOCK_RE = /```cifras\s*([\s\S]*?)```/gi;
const OPEN_RE = /```(cifras|propuesta)[\s\S]*$/i; // bloque aún incompleto (streaming)

export function parseDataBlocks(content) {
  if (!content) return { text: '', blocks: [] };
  const blocks = [];
  let match;
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && Array.isArray(parsed.items)) blocks.push(parsed);
    } catch {
      // JSON inválido: se ignora.
    }
  }
  const text = content.replace(BLOCK_RE, '').replace(OPEN_RE, '').trim();
  return { text, blocks };
}