import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

// Registro de consumo en modo monto: product_id fijo, quantity = USD consumidos.
export const AMOUNT_KEY = '__monto__';

// Clave de semana = fecha del último día de reinicio (incluye hoy).
export function getWeekKey(resetDay = 1, date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() - resetDay + 7) % 7));
  return format(d, 'yyyy-MM-dd');
}

const isAmountMode = (staff) => staff?.bonus_mode === 'monto';

// Saldo disponible de la semana: por product_id, o { __monto__: USD } en modo monto.
export async function getStaffBonusBalance(staff) {
  const week_key = getWeekKey(staff.bonus_reset_day ?? 1);
  const { rows } = await base44.entities.StaffBonusConsumption.aggregate({
    query: { staff_id: staff.id, week_key }, groupBy: 'product_id', sum: 'quantity',
  });
  const used = Object.fromEntries(rows.map(r => [r.product_id, r.sum_quantity || 0]));
  if (isAmountMode(staff)) {
    return { [AMOUNT_KEY]: Math.max(0, +((staff.weekly_bonus_amount_usd || 0) - (used[AMOUNT_KEY] || 0)).toFixed(4)) };
  }
  const balance = {};
  for (const b of staff.weekly_bonus || []) balance[b.product_id] = Math.max(0, (b.quantity_per_week || 0) - (used[b.product_id] || 0));
  return balance;
}

function applyAmountBonus(cart, staff, balance, disc) {
  let left = balance[AMOUNT_KEY] || 0;
  return cart.map(item => {
    if (item.is_courtesy) return item;
    const cost = (item.quantity || 1) * item.unit_price;
    const covered = Math.min(cost, left);
    left -= covered;
    const rest = cost - covered;
    return {
      ...item,
      bonus_amount_usd: +covered.toFixed(4),
      is_courtesy: rest <= 0.0001,
      staff_discount: rest > 0.0001 && disc > 0,
      subtotal: +(rest * (1 - disc)).toFixed(4),
    };
  });
}

// Aplica cortesía hasta el cupo y descuento % al excedente.
export function applyStaffBonus(cart, staff, balance) {
  if (staff?.bonus_enabled && staff.bonus_unlimited) {
    return cart.map(item => ({ ...item, is_courtesy: true, staff_unlimited: true, subtotal: 0 }));
  }
  if (!staff?.bonus_enabled || !balance) return cart;
  const disc = (staff.discount_percentage || 0) / 100;
  if (isAmountMode(staff)) return applyAmountBonus(cart, staff, balance, disc);
  const left = { ...balance };
  return cart.map(item => {
    if (!(item.product_id in left) || item.is_courtesy) return item;
    const qty = item.quantity || 1;
    const free = Math.min(qty, left[item.product_id]);
    left[item.product_id] -= free;
    const paidQty = qty - free;
    return {
      ...item,
      bonus_free_qty: free,
      is_courtesy: paidQty === 0,
      staff_discount: paidQty > 0 && disc > 0,
      subtotal: +(paidQty * item.unit_price * (1 - disc)).toFixed(4),
    };
  });
}

export async function recordStaffBonusConsumption(staff, pricedCart, sale) {
  const week_key = getWeekKey(staff.bonus_reset_day ?? 1);
  const base = { staff_id: staff.id, staff_name: staff.full_name, sale_id: sale?.id, sale_date: sale?.sale_date, week_key };
  let recs;
  if (isAmountMode(staff)) {
    const usd = pricedCart.reduce((s, i) => s + (i.bonus_amount_usd || 0), 0);
    recs = usd > 0 ? [{ ...base, product_id: AMOUNT_KEY, product_name: 'Cupo por monto', quantity: +usd.toFixed(4) }] : [];
  } else {
    recs = pricedCart.filter(i => i.bonus_free_qty > 0).map(i => ({
      ...base, product_id: i.product_id, product_name: i.product_name, quantity: i.bonus_free_qty,
    }));
  }
  if (recs.length) await base44.entities.StaffBonusConsumption.bulkCreate(recs);
}