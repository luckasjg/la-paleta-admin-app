import moment from 'moment';
import { computeCogs } from '@/lib/cogsCalculator';

/**
 * Cortesías y bonos de colaborador de un conjunto de ventas.
 * Un ítem cuenta si es cortesía (is_courtesy) o si parte de sus unidades la
 * cubrió el bono semanal (bonus_free_qty). Se calcula el valor de venta no
 * cobrado y su costo real (proporcional a las unidades gratis).
 */
export function computeCourtesyStats({ sales = [], supplies = [], recipes = [], trays = [], products = [] }) {
  const byStaff = {};
  const byProduct = {};
  const byDay = {};
  let units = 0, foregone = 0, cost = 0;

  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const qty = item.quantity || 1;
      const freeQty = item.is_courtesy ? qty : Math.min(item.bonus_free_qty || 0, qty);
      if (freeQty <= 0) return;
      const share = freeQty / qty;
      const value = freeQty * (item.unit_price || 0);
      const itemCost = computeCogs({
        sales: [{ items: [{ ...item, quantity: qty * share, grams: (item.grams || 0) * share }] }],
        supplies, recipes, trays, products,
      });

      units += freeQty;
      foregone += value;
      cost += itemCost;

      const staff = sale.benefit_staff_name || 'Cortesía general';
      const product = item.product_name || 'Producto';
      const day = sale.sale_date ? moment(sale.sale_date).format('DD/MM') : '—';
      [[byStaff, staff], [byProduct, product], [byDay, day]].forEach(([map, key]) => {
        if (!map[key]) map[key] = { name: key, units: 0, value: 0, cost: 0 };
        map[key].units += freeQty;
        map[key].value += value;
        map[key].cost += itemCost;
      });
    });
  });

  const sortDesc = (map) => Object.values(map).sort((a, b) => b.cost - a.cost);
  return {
    units,
    foregone,
    cost,
    byStaff: sortDesc(byStaff),
    byProduct: sortDesc(byProduct),
    daily: Object.values(byDay).sort((a, b) => moment(a.name, 'DD/MM') - moment(b.name, 'DD/MM')),
  };
}