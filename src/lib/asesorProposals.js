// Extrae propuestas de cambio emitidas por el asesor como bloques ```propuesta { ... } ```
// Devuelve { text, proposals } donde `text` es el contenido sin los bloques.

const BLOCK_RE = /```propuesta\s*([\s\S]*?)```/gi;

export function parseProposals(content) {
  if (!content) return { text: '', proposals: [] };
  const proposals = [];
  let match;
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && parsed.entity) proposals.push(parsed);
    } catch {
      // Bloque incompleto (streaming) o JSON inválido: se ignora.
    }
  }
  const text = content.replace(BLOCK_RE, '').trim();
  return { text, proposals };
}

// Entidades que el asesor puede proponer modificar. Todo lo demás se bloquea en la UI.
export const ALLOWED_PROPOSAL_ENTITIES = ['Product', 'Expense', 'Supply', 'Recipe', 'Preparation'];