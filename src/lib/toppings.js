/**
 * Toppings por unidad de un ítem (`unit_toppings`).
 * Cada unidad es una lista de { product_id, product_name, list_price, price,
 * included, none?, deducted? }. Los primeros `included_toppings_count` van
 * incluidos ($0.00); el resto se cobra a su precio normal. Un cupo incluido
 * vacío queda pendiente para Despacho.
 */
export const isTopping = (p) => (p?.category || '').toLowerCase() === 'adicional' && p?.is_active !== false;

export function allowedToppings(allowedIds = [], products = []) {
  const all = products.filter(isTopping);
  return allowedIds?.length ? all.filter(t => allowedIds.includes(t.id)) : all;
}

export const hasToppings = (item) => (item?.included_toppings_count || 0) > 0;

export function toppingFields(product) {
  if (!(product?.included_toppings_count > 0)) return {};
  return {
    included_toppings_count: product.included_toppings_count,
    allowed_topping_ids: product.allowed_topping_ids || [],
  };
}

export function getUnitToppings(item, qty = item?.quantity || 1) {
  const src = Array.isArray(item?.unit_toppings) ? item.unit_toppings : [];
  return Array.from({ length: qty }, (_, i) => (Array.isArray(src[i]) ? src[i].map(t => ({ ...t })) : []));
}

export function normalizeUnit(list = [], included = 0) {
  let n = 0;
  return list.map(t => {
    const inc = n < included;
    if (inc) n++;
    return { ...t, included: inc, price: inc ? 0 : (t.list_price || 0) };
  });
}

export const pendingIn = (unit = [], included = 0) => Math.max(0, included - unit.filter(t => t.included).length);
export const extraOf = (unit = []) => +unit.filter(t => !t.included).reduce((s, t) => s + (t.price || 0), 0).toFixed(2);
export const toppingsExtraTotal = (item) => (item?.unit_topping_extras || []).reduce((s, x) => s + (x || 0), 0);

export function withToppings(item, units) {
  const inc = item.included_toppings_count || 0;
  const norm = units.map(u => normalizeUnit(u, inc));
  const pending = norm.reduce((s, u) => s + pendingIn(u, inc), 0);
  return {
    ...item,
    unit_toppings: norm,
    unit_topping_extras: norm.map(extraOf),
    pending_included_toppings: pending,
    pending_toppings: pending > 0,
  };
}

export const resizeToppings = (item, qty) => (hasToppings(item) ? withToppings(item, getUnitToppings(item, qty)) : item);

export const toppingNames = (unit = []) => unit.map(t => (t.none ? 'Sin topping' : t.product_name)).join(', ');

/** Marca como descontados los toppings aún no descontados y devuelve las líneas de insumo y su costo. */
export function deductToppings(item, products = [], supplies = []) {
  const lines = [];
  let cost = 0;
  const unit_toppings = getUnitToppings(item).map(u => u.map(t => {
    if (t.none || t.deducted) return t;
    const p = products.find(x => x.id === t.product_id);
    for (const ls of (p?.linked_supplies || [])) {
      if (!ls.supply_id || !(ls.quantity > 0)) continue;
      lines.push({ supply_id: ls.supply_id, quantity: ls.quantity });
      cost += (supplies.find(s => s.id === ls.supply_id)?.cost_per_unit || 0) * ls.quantity;
    }
    return { ...t, deducted: true };
  }));
  return { item: { ...item, unit_toppings, toppings_cost: +((item.toppings_cost || 0) + cost).toFixed(4) }, lines };
}