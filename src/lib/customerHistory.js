import { base44 } from '@/api/base44Client';

// Historial de consumo de un cliente: ventas a crédito (vía cuentas por cobrar) + pedidos.
// Las ventas de contado no guardan cliente, por eso no aparecen aquí.
export async function getCustomerHistory(customer) {
  const [recv, byId, byPhone] = await Promise.all([
    base44.entities.AccountReceivable.filter({ customer_id: customer.id }, { sort: '-sale_date', limit: 200, fields: ['sale_id'] }),
    base44.entities.Order.filter({ customer_id: customer.id, status: { $ne: 'cancelado' } }, { sort: '-created_date', limit: 200 }),
    base44.entities.Order.filter({ customer_phone: customer.phone, status: { $ne: 'cancelado' } }, { sort: '-created_date', limit: 200 }),
  ]);
  const saleIds = recv.items.map(r => r.sale_id).filter(Boolean);
  const sales = saleIds.length
    ? (await base44.entities.Sale.filter({ id: { $in: saleIds }, status: { $ne: 'voided' } }, { limit: 200 })).items
    : [];

  const orders = [...new Map([...byId.items, ...byPhone.items].map(o => [o.id, o])).values()]
    .filter(o => !o.linked_sale_id || !saleIds.includes(o.linked_sale_id));

  const entries = [
    ...sales.map(s => ({ id: s.id, kind: 'Venta a crédito', date: s.sale_date || s.created_date, total: s.total_eur ?? s.total, items: s.items || [] })),
    ...orders.map(o => ({ id: o.id, kind: 'Pedido', date: o.created_date, total: o.total, items: o.items || [] })),
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