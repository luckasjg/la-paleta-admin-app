export const LOYALTY_KEY = 'loyalty_rules';
export const DEFAULT_RULES = { points_per_eur: 1, min_visit_eur: 0 };
export const LEVEL_POINTS = 100;

export const parseRules = (value) => {
  try { return { ...DEFAULT_RULES, ...JSON.parse(value || '{}') }; } catch { return DEFAULT_RULES; }
};

// Puntos en base USD (1 USD = 1 punto). Los puntos de ventas a crédito solo valen
// en la proporción pagada. Nivel 1: 100 puntos pagados exactos. Niveles siguientes:
// las deudas de las compras que generaron ese nivel deben estar saldadas.
export function computeLoyalty(entries, rules) {
  const rate = Number(rules.points_per_eur) || 0;
  const min = Number(rules.min_visit_eur) || 0;
  const valid = entries
    .filter(e => (e.usd ?? e.total ?? 0) >= min)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => {
      const pts = Math.floor((e.usd ?? e.total ?? 0) * rate);
      const paidRatio = e.credit && e.credit.amount > 0 ? Math.max(0, 1 - e.credit.balance / e.credit.amount) : 1;
      return { ...e, pts, paidPts: Math.floor(pts * paidRatio + 1e-9), settled: !e.credit || e.credit.balance <= 0.005 };
    });

  const points = valid.reduce((s, e) => s + e.pts, 0);
  const paidPoints = valid.reduce((s, e) => s + e.paidPts, 0);
  const totalLevels = Math.floor(points / LEVEL_POINTS);

  let unlocked = 0;
  let blockers = [];
  for (let n = 1; n <= totalLevels; n++) {
    if (n === 1) {
      if (paidPoints >= LEVEL_POINTS) { unlocked = 1; continue; }
      blockers = valid.filter(e => !e.settled);
      break;
    }
    const from = (n - 1) * LEVEL_POINTS, to = n * LEVEL_POINTS;
    let acc = 0;
    const contrib = [];
    for (const e of valid) {
      const start = acc; acc += e.pts;
      if (e.pts > 0 && acc > from && start < to) contrib.push(e);
    }
    const pending = contrib.filter(e => !e.settled);
    if (pending.length) { blockers = pending; break; }
    unlocked = n;
  }

  return {
    visits: valid.length,
    points,
    paidPoints,
    pendingPoints: points - paidPoints,
    spent: valid.reduce((s, e) => s + (e.total || 0), 0),
    unlockedLevels: unlocked,
    lockedLevels: totalLevels - unlocked,
    blockers,
    nextTarget: (unlocked + 1) * LEVEL_POINTS,
  };
}