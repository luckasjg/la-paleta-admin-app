import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getStockTotal } from '@/lib/stockHelpers';

const MICRO_RE = /estabiliz|especia|escencia|esencia|colorante|aroma/i;

export const isMicroDose = (s) => MICRO_RE.test(`${s?.category || ''} ${s?.name || ''}`);
export const defaultResidualThreshold = (s) => ((s?.unit === 'g' || s?.unit === 'ml') && !isMicroDose(s) ? 20 : 0);
export const residualThreshold = (s) => (Number.isFinite(s?.residual_threshold) ? s.residual_threshold : defaultResidualThreshold(s));

export const isResidual = (s, stock = getStockTotal(s)) =>
  !s?.is_infinite && stock > 0 && stock <= residualThreshold(s);

export const fmtQty = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

export const auditAction = async (payload) => (await base44.functions.invoke('inventoryAuditor', payload)).data;

export function useInventoryAudit(enabled) {
  return useQuery({
    queryKey: ['inventory_audit'],
    enabled,
    staleTime: 60_000,
    queryFn: () => auditAction({ action: 'run' }),
  });
}

const NOTIFY_KEY = 'inventory_audit_notify_at';
// Envía a Slack los hallazgos nuevos (el servidor evita repetir en 24 h).
export function notifyAudit(force = false) {
  const last = Number(localStorage.getItem(NOTIFY_KEY)) || 0;
  if (!force && Date.now() - last < 15 * 60_000) return;
  localStorage.setItem(NOTIFY_KEY, String(Date.now()));
  auditAction({ action: 'notify' }).catch(() => {});
}

export const GROUPS = [
  { id: 'residual', label: 'Residuales', types: ['residual_stock'] },
  { id: 'overstock', label: 'Sobreexistencias / Sin deducción', types: ['unlinked_catalog_items', 'stagnant_overstock', 'orphan_supply_in_stock'] },
  { id: 'kardex', label: 'Descuadres', types: ['negative_or_kardex_mismatch'] },
];

export const TYPE_LABEL = {
  residual_stock: 'Residual de empaque',
  unlinked_catalog_items: 'Vendido sin deducción',
  stagnant_overstock: 'Stock congelado',
  orphan_supply_in_stock: 'Insumo sin uso',
  negative_or_kardex_mismatch: 'Descuadre de kardex',
};