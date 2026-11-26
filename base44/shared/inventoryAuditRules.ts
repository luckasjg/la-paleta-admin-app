// Reglas del Auditor de Inventario: funciones puras sobre los datos ya cargados.
import { stockTotal } from './lowStock.ts';

export { stockTotal };

const DAY = 864e5;
const MICRO_RE = /estabiliz|especia|escencia|esencia|colorante|aroma/i;
const SERVICE_RE = /delivery|servicio|env[ií]o/i;

export const TYPE_LABEL = {
  residual_stock: 'Residual de empaque',
  unlinked_catalog_items: 'Vendido sin deducción',
  stagnant_overstock: 'Stock congelado',
  orphan_supply_in_stock: 'Insumo sin uso',
  negative_or_kardex_mismatch: 'Descuadre de kardex',
};

export const isMicroDose = (s) => MICRO_RE.test(`${s.category || ''} ${s.name || ''}`);
export const thresholdOf = (s) =>
  Number.isFinite(s.residual_threshold)
    ? s.residual_threshold
    : ((s.unit === 'g' || s.unit === 'ml') && !isMicroDose(s) ? 20 : 0);

const fmt = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};
const ts = (d) => new Date(d || 0).getTime();
const isToppingProduct = (p) => (p.category || '').toLowerCase() === 'adicional';

export function stockAt(s, loc) {
  const hasNew = Number.isFinite(s.stock_warehouse) || Number.isFinite(s.stock_production);
  if (loc === 'warehouse') return Number.isFinite(s.stock_warehouse) ? s.stock_warehouse : (hasNew ? 0 : (s.stock_current || 0));
  return Number.isFinite(s.stock_production) ? s.stock_production : 0;
}

export function buildFindings({ supplies, recipes, products, preparations, sales, adjustments, now = Date.now() }) {
  const findings = [];
  const since10 = now - 10 * DAY;
  const since7 = now - 7 * DAY;

  // Dónde se usa cada insumo (recetas, productos, toppings, preparados activos)
  const uses = new Map();
  const addUse = (id, source, name, qty) => {
    if (!id) return;
    if (!uses.has(id)) uses.set(id, []);
    uses.get(id).push({ source, name, qty: Number(qty) || 0 });
  };
  recipes.filter(r => r.is_active !== false).forEach(r =>
    [...(r.ingredients || []), ...(r.variegatos || [])].forEach(i => addUse(i.supply_id, 'receta', r.name, i.quantity)));
  const activeProducts = products.filter(p => p.is_active !== false);
  activeProducts.forEach(p => {
    const src = isToppingProduct(p) ? 'topping' : 'producto';
    (p.linked_supplies || []).forEach(l => addUse(l.supply_id, src, p.name, l.quantity));
    if (p.utensil_supply_id) addUse(p.utensil_supply_id, src, p.name, 1);
  });
  preparations.filter(p => p.is_active !== false).forEach(p =>
    (p.ingredients || []).forEach(i => addUse(i.supply_id, 'preparado', p.name, i.quantity)));

  // Salidas reales en los últimos 10 días (consumos de producción + ventas)
  const outgoing = new Set();
  adjustments.forEach(a => {
    if ((a.quantity_change || 0) < 0 && ts(a.created_date) >= since10 && a.type !== 'audit_correction' && a.reason !== 'conteo_fisico') {
      outgoing.add(a.supply_id || a.reference_id);
    }
  });
  const soldCount = {};
  sales.forEach(sale => {
    const t = ts(sale.sale_date || sale.created_date);
    (sale.items || []).forEach(it => {
      if (t >= since10) {
        (it.linked_supplies || []).forEach(l => outgoing.add(l.supply_id));
        if (it.utensil_supply_id) outgoing.add(it.utensil_supply_id);
        (it.unit_toppings || []).flat().forEach(tp => (tp?.deducted_supplies || []).forEach(d => outgoing.add(d.supply_id)));
      }
      if (t >= since7) {
        if (it.product_id) soldCount[it.product_id] = (soldCount[it.product_id] || 0) + (it.quantity || 1);
        (it.unit_toppings || []).flat().forEach(tp => {
          if (tp?.product_id && !tp.none) soldCount[tp.product_id] = (soldCount[tp.product_id] || 0) + 1;
        });
      }
    });
  });

  supplies.forEach(s => {
    if (s.is_infinite) return;
    const stock = stockTotal(s);
    const base = { supply_id: s.id, name: s.name, unit: s.unit, stock, category: s.category || '', stock_warehouse: stockAt(s, 'warehouse'), stock_production: stockAt(s, 'production') };
    if (stock < -0.0001) {
      findings.push({ ...base, key: `negative:${s.id}`, type: 'negative_or_kardex_mismatch', severity: 'high',
        title: `${s.name}: saldo negativo`, detail: `El sistema marca ${fmt(stock)} ${s.unit}. Se descontó más de lo que había registrado.` });
      return;
    }
    if (stock <= 0) return;
    const u = uses.get(s.id) || [];
    const th = thresholdOf(s);
    const reqs = u.filter(x => x.qty > 0);
    const minUse = reqs.length ? reqs.reduce((m, x) => (x.qty < m.qty ? x : m)) : null;
    if (stock <= th || (minUse && stock < minUse.qty)) {
      const why = stock <= th
        ? `por debajo del umbral utilizable de ${fmt(th)} ${s.unit}`
        : `menor al mínimo que usa ${minUse.source} "${minUse.name}" (${fmt(minUse.qty)} ${s.unit})`;
      findings.push({ ...base, key: `residual:${s.id}`, type: 'residual_stock', severity: 'medium', threshold: th,
        title: `${s.name}: quedan ${fmt(stock)} ${s.unit}`, detail: `Posible residual de empaque, ${why}. Confirma si físicamente se agotó.` });
      return;
    }
    if (s.ignore_overstock_alert) return;
    if (!u.length) {
      findings.push({ ...base, key: `orphan:${s.id}`, type: 'orphan_supply_in_stock', severity: 'low',
        title: `${s.name}: ${fmt(stock)} ${s.unit} sin uso`, detail: 'Tiene existencia pero no está en ninguna receta, topping, producto ni preparado activo. Puede ser un duplicado o faltar el vínculo.' });
    } else if (!outgoing.has(s.id)) {
      findings.push({ ...base, key: `stagnant:${s.id}`, type: 'stagnant_overstock', severity: 'low',
        title: `${s.name}: sin salidas en 10 días`, detail: `Tiene ${fmt(stock)} ${s.unit} y está vinculado a ${u.length} receta(s)/producto(s), pero no registra consumo reciente.` });
    }
  });

  activeProducts.forEach(p => {
    if (SERVICE_RE.test(p.category || '') || p.requires_flavor) return;
    if (p.recipe_id || p.utensil_supply_id || (p.linked_supplies || []).length) return;
    const sold = soldCount[p.id] || 0;
    const kind = isToppingProduct(p) ? 'Topping' : 'Producto';
    findings.push({ key: `unlinked:${p.id}`, type: 'unlinked_catalog_items', severity: sold > 0 ? 'high' : 'low',
      product_id: p.id, name: p.name, sold, is_topping: isToppingProduct(p),
      title: `${kind} "${p.name}" sin insumos vinculados`,
      detail: sold > 0
        ? `Se vendió ${sold} vez/veces en los últimos 7 días sin descontar inventario: no tiene receta ni insumos asociados.`
        : 'Está activo pero no tiene receta ni insumos asociados; cuando se venda no descontará inventario.' });
  });

  adjustments
    .filter(a => Number.isFinite(a.stock_before) && Number.isFinite(a.stock_after) && Number.isFinite(a.quantity_change))
    .slice(0, 400)
    .forEach(a => {
      const gap = a.stock_after - a.stock_before - a.quantity_change;
      const noStock = a.quantity_change < 0 && a.stock_before <= 0;
      if (Math.abs(gap) <= 0.01 && !noStock) return;
      const name = a.supply_name || a.reference_name || 'Insumo';
      findings.push({ key: `kardex:${a.id}`, type: 'negative_or_kardex_mismatch', severity: 'high', supply_id: a.supply_id || null,
        name, unit: a.unit, adjustment_id: a.id,
        title: noStock ? `${name}: descuento sin stock` : `${name}: salto de kardex`,
        detail: noStock
          ? `${a.reference_label || 'Movimiento'} descontó ${fmt(-a.quantity_change)} ${a.unit || ''} cuando el saldo era ${fmt(a.stock_before)}.`
          : `Antes ${fmt(a.stock_before)} ${a.quantity_change >= 0 ? '+' : '−'} ${fmt(Math.abs(a.quantity_change))} debería dar ${fmt(a.stock_before + a.quantity_change)}, pero quedó en ${fmt(a.stock_after)} (${a.reference_label || a.reason || ''}).` });
    });

  return findings;
}

export const shouldNotify = (f) =>
  f.type === 'negative_or_kardex_mismatch' || f.type === 'residual_stock' || (f.type === 'unlinked_catalog_items' && f.sold > 0);

export function slackText(findings, heading) {
  const groups = {};
  findings.forEach(f => { (groups[f.type] = groups[f.type] || []).push(f); });
  const parts = Object.entries(groups).map(([type, list]) =>
    `*${TYPE_LABEL[type] || type}* (${list.length})\n` +
    list.slice(0, 15).map(f => `• *${f.title}*: ${f.detail}`).join('\n') +
    (list.length > 15 ? `\n_…y ${list.length - 15} más_` : ''));
  return `${heading}\n\n${parts.join('\n\n')}`;
}