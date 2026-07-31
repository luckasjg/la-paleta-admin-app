/**
 * Sesiones de caja cerradas que aún NO tienen auditoría de helados registrada.
 * Sólo se consideran sesiones "modernas" (con closed_at), para no arrastrar
 * cierres históricos previos a esta funcionalidad.
 */
// Las ventas reales comenzaron el 2026-07-30; sesiones anteriores fueron pruebas.
export const AUDIT_START_DATE = '2026-07-30';

export const getPendingAuditRegisters = (registers = [], audits = []) => {
  const audited = new Set(audits.map(a => a.cash_register_id).filter(Boolean));
  return registers
    .filter(r => r.status === 'cerrada' && r.closed_at && r.date >= AUDIT_START_DATE && !audited.has(r.id))
    .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));
};