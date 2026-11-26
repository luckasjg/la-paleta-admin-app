import { base44 } from '@/api/base44Client';
import { LEVEL_POINTS, computeLoyalty } from '@/lib/loyalty';

async function fetchAll(entity, query, fields) {
  const out = [];
  let cursor;
  do {
    const page = await base44.entities[entity].filter(query, { limit: 500, cursor, fields });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

const HAS = { $exists: true, $nin: [null, ''] };
const SALE_FIELDS = ['id', 'customer_id', 'total', 'total_eur', 'sale_date', 'created_date'];

// Arma las entradas de consumo de todos los clientes con las mismas reglas del historial individual.
export async function loadAllEntries() {
  const [sales, recv, orders, redemptions] = await Promise.all([
    fetchAll('Sale', { status: { $ne: 'voided' }, customer_id: HAS }, SALE_FIELDS),
    fetchAll('AccountReceivable', { sale_id: HAS }, ['customer_id', 'sale_id', 'amount_usd', 'balance_usd', 'status']),
    fetchAll('Order', { customer_id: HAS, status: { $ne: 'cancelado' } }),
    fetchAll('LoyaltyRedemption', {}, ['customer_id']),
  ]);
  const byId = new Map(sales.map(s => [s.id, s]));
  const missing = recv.map(r => r.sale_id).filter(id => !byId.has(id));
  if (missing.length) (await fetchAll('Sale', { id: { $in: missing }, status: { $ne: 'voided' } }, SALE_FIELDS)).forEach(s => byId.set(s.id, s));
  const recvBySale = new Map(recv.map(r => [r.sale_id, r]));

  const entries = {};
  const push = (cid, e) => { if (cid) (entries[cid] = entries[cid] || []).push(e); };
  for (const s of byId.values()) {
    const r = recvBySale.get(s.id);
    push(r?.customer_id || s.customer_id, { id: s.id, date: s.sale_date || s.created_date, total: s.total_eur ?? s.total, usd: s.total || 0,
      credit: r ? { amount: r.amount_usd || 0, balance: r.status === 'saldada' ? 0 : Math.max(0, r.balance_usd || 0) } : null });
  }
  for (const o of orders) {
    if (o.linked_sale_id && byId.has(o.linked_sale_id)) continue;
    push(o.customer_id, { id: o.id, date: o.created_date, total: o.total, usd: o.total || 0, credit: null });
  }
  const redeemed = {};
  redemptions.forEach(r => { redeemed[r.customer_id] = (redeemed[r.customer_id] || 0) + 1; });
  return { entries, redeemed };
}

export function computeStanding(entries, rules, redeemedCount = 0) {
  const l = computeLoyalty(entries, rules);
  const pendingRewards = Math.max(0, l.unlockedLevels - redeemedCount);
  const base = l.unlockedLevels * LEVEL_POINTS;
  const nextLevel = l.unlockedLevels + 1;
  if (pendingRewards > 0) {
    return { pct: 100, status: 'available', points: l.paidPoints, current: `Nivel ${l.unlockedLevels}`, next: `Beneficio Nivel ${l.unlockedLevels - pendingRewards + 1}`,
      label: pendingRewards > 1 ? `${pendingRewards} beneficios por canjear` : 'Beneficio listo para canjear' };
  }
  const reached = Math.min(l.paidPoints, l.nextTarget) - base;
  const blocked = l.paidPoints >= l.nextTarget && l.blockers.length > 0;
  const pct = Math.max(0, Math.min(blocked ? 99 : 100, (reached / LEVEL_POINTS) * 100));
  const left = Math.max(0, l.nextTarget - l.paidPoints);
  return {
    pct, status: blocked ? 'blocked' : 'progress', points: l.paidPoints,
    current: l.unlockedLevels ? `Nivel ${l.unlockedLevels}` : 'Sin nivel', next: `Nivel ${nextLevel}`,
    label: blocked ? 'Debe saldar deuda para liberar' : `Faltan ${left} pts${l.pendingPoints > 0 ? ' pagados' : ''}`,
    left,
  };
}

export function reminderMessage(c, st) {
  const name = (c.full_name || '').split(' ')[0];
  if (st.status === 'available') return `¡Hola ${name}! En La Paleta tienes un beneficio de fidelidad listo para canjear. ¡Te esperamos! 🍦`;
  if (st.status === 'blocked') return `¡Hola ${name}! Ya acumulaste los puntos para tu próximo beneficio en La Paleta. Solo falta saldar tu cuenta pendiente para liberarlo. 🍦`;
  return `¡Hola ${name}! Llevas ${st.points} puntos en La Paleta y te faltan solo ${st.left} para tu próximo beneficio (${st.next}). ¡Te esperamos! 🍦`;
}