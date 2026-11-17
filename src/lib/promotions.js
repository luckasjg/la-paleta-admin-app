/**
 * Motor de promociones del POS.
 * Expande el carrito en unidades (precio neto por unidad), evalúa cada
 * promoción activa del día y aplica de forma voraz la que más ahorra; sus
 * unidades quedan consumidas y se repite con las restantes. Así, ante un
 * conflicto, siempre gana la mejor promoción y nunca hay doble beneficio.
 */
export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const RULE_LABELS = {
  direct_discount: 'Descuento directo',
  quantity_bundle: 'Paquete por cantidad',
  buy_x_get_y: 'Compra X lleva Y',
};

export function promoActiveToday(p, day = new Date().getDay()) {
  return p.active !== false && (!p.days_of_week?.length || p.days_of_week.includes(day));
}

const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0)) / 100;
const has = (ids, id) => Array.isArray(ids) && ids.includes(id);

function unitsOf(cart) {
  const units = [];
  cart.forEach((it, idx) => {
    if (it.is_courtesy || it.staff_discount || it.bonus_free_qty) return;
    const q = it.quantity || 1;
    const price = (it.subtotal || 0) / q;
    if (!(price > 0)) return;
    for (let u = 0; u < q; u++) units.push({ key: `${idx}:${u}`, product_id: it.product_id, price });
  });
  return units;
}

function bundleModes(p, groups) {
  const modes = [];
  if (p.bundle_percent > 0) modes.push(groups.map(g => g.map(u => u.price * pct(p.bundle_percent))));
  if (p.extra_unit_percent > 0) modes.push(groups.map(g => g.map((u, i) => (i === g.length - 1 ? u.price * pct(p.extra_unit_percent) : 0))));
  if (p.bundle_price > 0) {
    modes.push(groups.map(g => {
      const sum = g.reduce((s, u) => s + u.price, 0);
      const off = Math.max(0, sum - p.bundle_price);
      return g.map(u => (sum ? (u.price / sum) * off : 0));
    }));
  }
  return modes;
}

function evaluate(p, units) {
  const discounts = {};
  let used = [];
  if (p.rule_type === 'direct_discount') {
    units.filter(u => has(p.applicable_product_ids, u.product_id)).forEach(u => {
      const d = p.discount_mode === 'amount' ? Math.min(u.price, p.discount_value || 0) : u.price * pct(p.discount_value);
      if (d > 0) { discounts[u.key] = d; used.push(u.key); }
    });
  } else if (p.rule_type === 'quantity_bundle') {
    const n = Math.max(2, p.min_quantity || 2);
    const elig = units.filter(u => has(p.applicable_product_ids, u.product_id)).sort((a, b) => b.price - a.price);
    const groups = [];
    for (let i = 0; i + n <= elig.length; i += n) groups.push(elig.slice(i, i + n));
    let best = null;
    for (const mode of bundleModes(p, groups)) {
      const total = mode.flat().reduce((s, x) => s + x, 0);
      if (!best || total > best.total) best = { total, mode };
    }
    if (best) {
      groups.forEach((g, gi) => g.forEach((u, ui) => { if (best.mode[gi][ui] > 0) discounts[u.key] = best.mode[gi][ui]; }));
      used = groups.flat().map(u => u.key);
    }
  } else if (p.rule_type === 'buy_x_get_y') {
    const n = Math.max(1, p.min_quantity || 1);
    const taken = new Set();
    const rewards = units.filter(u => has(p.reward_product_ids, u.product_id)).sort((a, b) => a.price - b.price);
    for (const r of rewards) {
      if (taken.has(r.key)) continue;
      const triggers = units
        .filter(u => u.key !== r.key && !taken.has(u.key) && has(p.applicable_product_ids, u.product_id))
        .sort((a, b) => b.price - a.price)
        .slice(0, n);
      if (triggers.length < n) break;
      taken.add(r.key);
      triggers.forEach(t => taken.add(t.key));
      discounts[r.key] = r.price * pct(p.reward_percent ?? 100);
    }
    used = [...taken];
  }
  const savings = Object.values(discounts).reduce((s, x) => s + x, 0);
  return { savings, discounts, used };
}

/** Promociones que aplican hoy al carrito, ignorando las que el cajero quitó. */
export function applyPromotions(cart, promotions = [], disabledIds = []) {
  let remaining = unitsOf(cart);
  let candidates = promotions.filter(p => promoActiveToday(p) && !disabledIds.includes(p.id));
  const perUnit = {};
  const names = {};
  const applied = [];
  while (candidates.length && remaining.length) {
    let best = null;
    for (const p of candidates) {
      const r = evaluate(p, remaining);
      if (r.savings > 0.004 && (!best || r.savings > best.r.savings)) best = { p, r };
    }
    if (!best) break;
    applied.push({ promotion_id: best.p.id, name: best.p.name, amount: +best.r.savings.toFixed(2) });
    Object.entries(best.r.discounts).forEach(([k, v]) => { perUnit[k] = v; names[k] = best.p.name; });
    const usedSet = new Set(best.r.used);
    remaining = remaining.filter(u => !usedSet.has(u.key));
    candidates = candidates.filter(p => p !== best.p);
  }

  const items = cart.map((it, idx) => {
    let d = 0;
    const ns = new Set();
    for (let u = 0; u < (it.quantity || 1); u++) {
      const k = `${idx}:${u}`;
      if (perUnit[k]) { d += perUnit[k]; ns.add(names[k]); }
    }
    d = +Math.min(d, it.subtotal || 0).toFixed(2);
    if (!(d > 0)) return it;
    return { ...it, subtotal_before_promo: it.subtotal, subtotal: +((it.subtotal || 0) - d).toFixed(2), promo_discount: d, promo_names: [...ns] };
  });
  const discount = +items.reduce((s, i) => s + (i.promo_discount || 0), 0).toFixed(2);
  return { items, discount, applied };
}

/** Promociones activas hoy que tocan algún producto del carrito (para reactivar las quitadas). */
export function promosTouchingCart(cart, promotions = []) {
  const ids = new Set(cart.map(i => i.product_id));
  return promotions.filter(p => promoActiveToday(p)
    && [...(p.applicable_product_ids || []), ...(p.reward_product_ids || [])].some(id => ids.has(id)));
}