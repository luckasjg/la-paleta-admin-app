import { base44 } from '@/api/base44Client';

// Historial de consumo de un cliente: ventas a crédito (vía cuentas por cobrar) + pedidos.
// Incluye ventas POS (contado o crédito) vinculadas por customer_id.
export async function getCustomerHistory(customer) {
  const [recv, byId, byPhone, direct] = await Promise.all([
    base44.entities.AccountReceivable.filter({ customer_id: customer.id }, { sort: '-sale_date', limit: 200, fields: ['sale_id', 'amount_usd', 'balance_usd', 'status'] }),
    base44.entities.Order.filter({ customer_id: customer.id, status: { $ne: 'cancelado' } }, { sort: '-created_date', limit: 200 }),
    base44.entities.Order.filter({ customer_phone: customer.phone, status: { $ne: 'cancelado' } }, { sort: '-created_date', limit: 200 }),
    base44.entities.Sale.filter({ customer_id: customer.id, status: { $ne: 'voided' } }, { sort: '-sale_date', limit: 200 }),
  ]);
  const creditIds = new Set(recv.items.map(r => r.sale_id).filter(Boolean));
  const credit = creditIds.size
    ? (await base44.entities.Sale.filter({ id: { $in: [...creditIds] }, status: { $ne: 'voided' } }, { limit: 200 })).items
    : [];
  const sales = [...new Map([...direct.items, ...credit].map(s => [s.id, s])).values()];
  const saleIds = sales.map(s => s.id);

  const orders = [...new Map([...byId.items, ...byPhone.items].map(o => [o.id, o])).values()]
    .filter(o => !o.linked_sale_id || !saleIds.includes(o.linked_sale_id));

  const entries = [
    ...sales.map(s => {
      const r = recv.items.find(x => x.sale_id === s.id);
      return { id: s.id, kind: r ? 'Venta a crédito' : 'Venta POS', date: s.sale_date || s.created_date, total: s.total_eur ?? s.total, usd: s.total || 0, items: s.items || [],
        credit: r ? { amount: r.amount_usd || 0, balance: r.status === 'saldada' ? 0 : Math.max(0, r.balance_usd || 0) } : null };
    }),
    ...orders.map(o => ({ id: o.id, kind: 'Pedido', date: o.created_date, total: o.total, usd: o.total || 0, items: o.items || [], credit: null })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const products = {}, flavors = {};
  for (const e of entries) for (const it of e.items) {
    const q = it.quantity || 1;
    const key = `${it.product_id || it.product_name}|${it.flavor || ''}|${it.vessel || ''}`;
    products[key] = products[key] || { product_id: it.product_id, product_name: it.product_name, flavor: it.flavor, vessel: it.vessel, count: 0 };
    products[key].count += q;
    const names = (it.flavors || []).map(f => f.recipe_name).filter(Boolean);
    for (const n of (names.length ? names : it.flavor ? it.flavor.split(' + ') : [])) flavors[n] = (flavors[n] || 0) + q;
  }
  const topCombos = Object.values(products).sort((a, b) => b.count - a.count);
  const topFlavors = Object.entries(flavors).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const spent = entries.reduce((s, e) => s + (e.total || 0), 0);
  return { entries, topCombos, topFlavors, spent, favorite: topCombos[0] || null };
}