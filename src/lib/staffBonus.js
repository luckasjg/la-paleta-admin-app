import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

// Clave de semana = fecha del último día de reinicio (incluye hoy).
export function getWeekKey(resetDay = 1, date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() - resetDay + 7) % 7));
  return format(d, 'yyyy-MM-dd');
}

// Saldo disponible por product_id para la semana actual.
export async function getStaffBonusBalance(staff) {
  const week_key = getWeekKey(staff.bonus_reset_day ?? 1);
  const { rows } = await base44.entities.StaffBonusConsumption.aggregate({
    query: { staff_id: staff.id, week_key }, groupBy: 'product_id', sum: 'quantity',
  });
  const used = Object.fromEntries(rows.map(r => [r.product_id, r.sum_quantity || 0]));
  const balance = {};
  for (const b of staff.weekly_bonus || []) balance[b.product_id] = Math.max(0, (b.quantity_per_week || 0) - (used[b.product_id] || 0));
  return balance;
}

// Aplica cortesía hasta el cupo y descuento % al excedente sobre productos bonificados.
export function applyStaffBonus(cart, staff, balance) {
  if (!staff?.bonus_enabled || !balance) return cart;
  const left = { ...balance };
  const disc = (staff.discount_percentage || 0) / 100;
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
  const recs = pricedCart.filter(i => i.bonus_free_qty > 0).map(i => ({
    staff_id: staff.id, staff_name: staff.full_name, product_id: i.product_id, product_name: i.product_name,
    quantity: i.bonus_free_qty, sale_id: sale?.id, sale_date: sale?.sale_date, week_key,
  }));
  if (recs.length) await base44.entities.StaffBonusConsumption.bulkCreate(recs);
}