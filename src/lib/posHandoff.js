// Traspaso de un pedido del menú móvil al POS para cobrarlo.
const KEY = 'pos_pending_order';

export function setPendingOrder(order) {
  localStorage.setItem(KEY, JSON.stringify(order));
}

export function getPendingOrder() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  localStorage.removeItem(KEY);
}

// Convierte los ítems de un pedido en ítems de carrito del POS,
// completando desde el producto los datos de inventario (recetas, insumos).
export function buildCartFromOrder(order, products) {
  return (order.items || []).map((it) => {
    const p = products.find((x) => x.id === it.product_id) || {};
    const qty = it.quantity || 1;
    const unitPrice = it.unit_price ?? p.price ?? 0;
    const flavors = Array.isArray(it.flavors) ? it.flavors : [];
    return {
      product_id: it.product_id,
      product_name: it.product_name || p.name,
      category: p.category,
      recipe_id: p.recipe_id,
      utensil_supply_id: p.utensil_supply_id || '',
      linked_supplies: Array.isArray(p.linked_supplies) ? p.linked_supplies : [],
      flavor: it.flavor || flavors.map((f) => f.recipe_name).join(' + '),
      flavors,
      tray_id: flavors[0]?.tray_id || '',
      grams: it.grams || p.grams_per_serving || 0,
      quantity: qty,
      base_price: it.base_price ?? unitPrice,
      flavor_surcharge: it.flavor_surcharge || 0,
      unit_price: unitPrice,
      subtotal: it.subtotal ?? unitPrice * qty,
      is_courtesy: false,
      vessel: it.vessel || null,
    };
  });
}