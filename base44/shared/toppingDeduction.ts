// Descuento de insumos de toppings de un ítem de venta (desde Producción).
// Marca cada topping como `deducted` para que nunca se descuente dos veces
// y acumula su costo real en `toppings_cost` (COGS).
export async function deductItemToppings(db, item) {
  const units = Array.isArray(item.unit_toppings) ? item.unit_toppings : [];
  const todo = units.flat().filter((t) => t && !t.none && !t.deducted && t.product_id);
  if (!todo.length) return item;

  const productIds = [...new Set(todo.map((t) => t.product_id))];
  const prodRes = await db.Product.filter({ id: { $in: productIds } });
  const products = Array.isArray(prodRes) ? prodRes : prodRes.items;
  const demand = {};
  todo.forEach((t) => {
    const p = products.find((x) => x.id === t.product_id);
    (p?.linked_supplies || []).forEach((ls) => {
      if (ls.supply_id && ls.quantity > 0) demand[ls.supply_id] = (demand[ls.supply_id] || 0) + ls.quantity;
    });
  });

  const supplyIds = Object.keys(demand);
  let cost = 0;
  if (supplyIds.length) {
    const supRes = await db.Supply.filter({ id: { $in: supplyIds } });
    const supplies = Array.isArray(supRes) ? supRes : supRes.items;
    await Promise.all(supplies.map((s) => {
      cost += (s.cost_per_unit || 0) * demand[s.id];
      if (s.is_infinite) return null;
      const avail = Number.isFinite(s.stock_production) ? s.stock_production : 0;
      const eff = Math.min(avail, demand[s.id]);
      if (!(eff > 0)) return null;
      return db.Supply.update(s.id, { stock_production: avail - eff, stock_current: (s.stock_current || 0) - eff });
    }));
  }

  return {
    ...item,
    unit_toppings: units.map((u) => (u || []).map((t) => (t.none || t.deducted ? t : { ...t, deducted: true }))),
    toppings_cost: +((item.toppings_cost || 0) + cost).toFixed(4),
  };
}