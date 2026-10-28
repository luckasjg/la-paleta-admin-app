export const LOYALTY_KEY = 'loyalty_rules';
export const DEFAULT_RULES = { points_per_eur: 1, min_visit_eur: 0 };

export const parseRules = (value) => {
  try { return { ...DEFAULT_RULES, ...JSON.parse(value || '{}') }; } catch { return DEFAULT_RULES; }
};

// Puntos y visitas a partir de compras válidas (el historial ya excluye anuladas/canceladas).
export function computeLoyalty(entries, rules) {
  const valid = entries.filter(e => (e.total || 0) >= (Number(rules.min_visit_eur) || 0));
  const spent = valid.reduce((s, e) => s + (e.total || 0), 0);
  return { visits: valid.length, points: Math.floor(spent * (Number(rules.points_per_eur) || 0)), spent };
}