import moment from 'moment';

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MONTHS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  mixto: 'Mixto',
  cortesia: 'Cortesía',
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Variación porcentual entre el valor actual y el anterior. */
export function pctDelta(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const shiftOf = (hour) => (hour < 12 ? 'Mañana' : hour < 18 ? 'Tarde' : 'Noche');

const sumTotal = (list) => list.reduce((s, v) => s + (v.total || 0), 0);

const salesInMonth = (sales, year, month) => sales.filter(s => {
  if (!s.sale_date) return false;
  const m = moment(s.sale_date);
  return m.year() === year && m.month() === month;
});

/** Métricas básicas de un conjunto de ventas. */
function baseMetrics(list) {
  const revenue = sumTotal(list);
  const count = list.length;
  const units = list.reduce((s, sale) =>
    s + (sale.items || []).reduce((a, it) => a + (it.quantity || 1), 0), 0);
  return { revenue, count, avgTicket: count > 0 ? revenue / count : 0, units };
}

const FLAVOR_SEP = ' + ';

/**
 * Sabores individuales de un ítem de venta.
 * Fuente principal: item.flavors[] (desglose real con gramos por bandeja).
 * Respaldo para ventas antiguas sin ese arreglo: se separa la etiqueta
 * combinada (“Chocolate + Vainilla”) y se reparten los gramos en partes iguales,
 * para que el histórico también cuente por sabor y no por combinación.
 */
function itemFlavorParts(item) {
  const fromArray = (Array.isArray(item.flavors) ? item.flavors : [])
    .filter(f => f && f.recipe_name)
    .map(f => ({ name: f.recipe_name, grams: f.grams || 0 }));
  if (fromArray.length > 0) return fromArray;

  if (item.flavor) {
    const names = String(item.flavor).split(FLAVOR_SEP).map(n => n.trim()).filter(Boolean);
    if (names.length > 0) {
      const each = (item.grams || 0) / names.length;
      return names.map(name => ({ name, grams: each }));
    }
  }
  return [];
}

/** Etiqueta canónica de una combinación (orden alfabético para unificar variantes). */
function combinationLabel(parts) {
  return [...parts].map(p => p.name).sort((a, b) => a.localeCompare(b)).join(FLAVOR_SEP);
}

/**
 * Conteo de ítems vendidos: ranking de productos (sabores ya contabilizados de
 * forma individual), ranking exclusivo de sabores (por veces pedido y por gramos
 * servidos) y combinaciones más pedidas.
 */
export function itemBreakdown(list = []) {
  const productMap = {};
  const flavorMap = {};
  const comboMap = {};

  const bump = (map, name, { units, grams, revenue }) => {
    if (!map[name]) map[name] = { name, units: 0, grams: 0, revenue: 0 };
    map[name].units += units;
    map[name].grams += grams;
    map[name].revenue += revenue;
  };

  list.forEach(sale => {
    (sale.items || []).forEach(item => {
      const qty = item.quantity || 1;
      const subtotal = item.subtotal || 0;
      const parts = itemFlavorParts(item);

      if (parts.length === 0) {
        const name = item.product_name;
        if (name) bump(productMap, name, { units: qty, grams: (item.grams || 0) * qty, revenue: subtotal });
        return;
      }

      // Cada sabor suma una aparición (aunque venga en combinación) y sus
      // gramos reales; el ingreso se reparte proporcional a los gramos.
      const totalGrams = parts.reduce((s, p) => s + p.grams, 0);
      parts.forEach(p => {
        const share = totalGrams > 0 ? p.grams / totalGrams : 1 / parts.length;
        const data = { units: qty, grams: p.grams * qty, revenue: subtotal * share };
        bump(flavorMap, p.name, data);
        bump(productMap, p.name, data);
      });

      if (parts.length > 1) {
        const label = combinationLabel(parts);
        if (!comboMap[label]) comboMap[label] = { name: label, size: parts.length, units: 0, grams: 0, revenue: 0 };
        comboMap[label].units += qty;
        comboMap[label].grams += totalGrams * qty;
        comboMap[label].revenue += subtotal;
      }
    });
  });

  const flavors = Object.values(flavorMap);

  return {
    products: Object.values(productMap).sort((a, b) => b.units - a.units),
    flavors: {
      byCount: [...flavors].sort((a, b) => b.units - a.units),
      byGrams: [...flavors].sort((a, b) => b.grams - a.grams),
      totalUnits: flavors.reduce((s, f) => s + f.units, 0),
      totalGrams: flavors.reduce((s, f) => s + f.grams, 0),
    },
    combinations: Object.values(comboMap).sort((a, b) => b.units - a.units),
  };
}

/** Desglose de un conjunto de ventas: productos, métodos de pago, horas, días. */
function breakdown(list) {
  const paymentMap = {};
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}:00`, hour: h, ventas: 0, count: 0 }));
  const weekday = DAY_NAMES.map(name => ({ name, ventas: 0, count: 0, dates: new Set() }));
  const shiftMap = { 'Mañana': { ventas: 0, count: 0 }, 'Tarde': { ventas: 0, count: 0 }, 'Noche': { ventas: 0, count: 0 } };

  list.forEach(sale => {
    const method = sale.payment_method || 'otro';
    if (!paymentMap[method]) paymentMap[method] = { key: method, name: PAYMENT_LABELS[method] || method, value: 0, count: 0 };
    paymentMap[method].value += sale.total || 0;
    paymentMap[method].count += 1;

    if (sale.sale_date) {
      const m = moment(sale.sale_date);
      const h = m.hour();
      hourly[h].ventas += sale.total || 0;
      hourly[h].count += 1;
      const wd = weekday[m.day()];
      wd.ventas += sale.total || 0;
      wd.count += 1;
      wd.dates.add(m.format('YYYY-MM-DD'));
      const sh = shiftMap[shiftOf(h)];
      sh.ventas += sale.total || 0;
      sh.count += 1;
    }
  });

  const revenue = sumTotal(list);

  return {
    ...itemBreakdown(list),
    payments: Object.values(paymentMap)
      .sort((a, b) => b.value - a.value)
      .map(p => ({ ...p, pct: revenue > 0 ? (p.value / revenue) * 100 : 0, avg: p.count > 0 ? p.value / p.count : 0 })),
    hourly,
    weekday: weekday.map(d => ({
      name: d.name,
      ventas: d.ventas,
      count: d.count,
      occurrences: d.dates.size,
      avgPerDay: d.dates.size > 0 ? d.ventas / d.dates.size : 0,
    })),
    shifts: Object.entries(shiftMap).map(([name, v]) => ({
      name,
      ventas: v.ventas,
      count: v.count,
      pct: revenue > 0 ? (v.ventas / revenue) * 100 : 0,
    })),
  };
}

/** Ventas por día calendario del mes seleccionado. */
function dailySeries(list, year, month) {
  const days = moment({ year, month }).daysInMonth();
  const rows = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    label: String(i + 1).padStart(2, '0'),
    fecha: moment({ year, month, day: i + 1 }).format('DD/MM/YYYY'),
    ventas: 0,
    count: 0,
  }));
  list.forEach(s => {
    if (!s.sale_date) return;
    const d = moment(s.sale_date).date();
    if (rows[d - 1]) {
      rows[d - 1].ventas += s.total || 0;
      rows[d - 1].count += 1;
    }
  });
  return rows.map(r => ({ ...r, avgTicket: r.count > 0 ? r.ventas / r.count : 0 }));
}

/**
 * Construye TODOS los datos derivados que consumen las vistas ampliadas del
 * dashboard: métricas del mes, comparación con el mes anterior, series anuales,
 * desgloses completos y ventana de los últimos 7 / 14 días.
 */
export function buildDashboardAnalytics({ sales = [], selectedYear, selectedMonth }) {
  const monthSales = salesInMonth(sales, selectedYear, selectedMonth);
  const prevRef = moment({ year: selectedYear, month: selectedMonth }).subtract(1, 'month');
  const prevSales = salesInMonth(sales, prevRef.year(), prevRef.month());

  const month = { ...baseMetrics(monthSales), ...breakdown(monthSales), sales: monthSales };
  const prev = {
    ...baseMetrics(prevSales),
    ...itemBreakdown(prevSales),
    sales: prevSales,
    label: `${MONTHS_LONG[prevRef.month()]} ${prevRef.year()}`,
  };
  const byDay = dailySeries(monthSales, selectedYear, selectedMonth);
  const activeDays = byDay.filter(d => d.count > 0).length;
  const bestDay = [...byDay].sort((a, b) => b.ventas - a.ventas)[0] || null;

  // ── Serie anual + año anterior ────────────────────────────────────────
  const annualFor = (year) => {
    const totals = Array(12).fill(0);
    const counts = Array(12).fill(0);
    sales.forEach(s => {
      if (!s.sale_date) return;
      const m = moment(s.sale_date);
      if (m.year() !== year) return;
      totals[m.month()] += s.total || 0;
      counts[m.month()] += 1;
    });
    return MONTHS_SHORT.map((name, idx) => ({
      name,
      fullName: MONTHS_LONG[idx],
      idx,
      ventas: totals[idx],
      transacciones: counts[idx],
      avgTicket: counts[idx] > 0 ? totals[idx] / counts[idx] : 0,
    }));
  };
  const annual = annualFor(selectedYear);
  const prevAnnual = annualFor(selectedYear - 1);
  const yearTotal = annual.reduce((s, d) => s + d.ventas, 0);
  const prevYearTotal = prevAnnual.reduce((s, d) => s + d.ventas, 0);

  // ── Hoy / ayer / últimos 7 y 14 días (siempre en tiempo real) ─────────
  const todayKey = moment().format('YYYY-MM-DD');
  const dayKey = (s) => (s.sale_date ? moment(s.sale_date).format('YYYY-MM-DD') : null);
  const todaySales = sales.filter(s => dayKey(s) === todayKey);
  const yesterdayKey = moment().subtract(1, 'day').format('YYYY-MM-DD');
  const yesterdaySales = sales.filter(s => dayKey(s) === yesterdayKey);

  const windowDays = (startOffset, length) => Array.from({ length }, (_, i) => {
    const d = moment().subtract(startOffset + (length - 1 - i), 'days');
    const key = d.format('YYYY-MM-DD');
    const list = sales.filter(s => dayKey(s) === key);
    return {
      key,
      label: d.format('DD/MM'),
      dayName: DAY_NAMES[d.day()],
      ventas: sumTotal(list),
      count: list.length,
    };
  });

  const last7 = windowDays(0, 7);
  const prev7 = windowDays(7, 7);
  const weekTotal = last7.reduce((s, d) => s + d.ventas, 0);
  const prevWeekTotal = prev7.reduce((s, d) => s + d.ventas, 0);
  const maxOf = (list) => list.reduce((m, d) => Math.max(m, d.ventas), 0);

  return {
    month,
    prev,
    byDay,
    activeDays,
    bestDay,
    avgPerActiveDay: activeDays > 0 ? month.revenue / activeDays : 0,
    annual,
    prevAnnual,
    yearTotal,
    prevYearTotal,
    today: {
      ...baseMetrics(todaySales),
      sales: todaySales,
      hourly: breakdown(todaySales).hourly,
      payments: breakdown(todaySales).payments,
      yesterday: baseMetrics(yesterdaySales),
    },
    week: {
      days: last7,
      total: weekTotal,
      prevTotal: prevWeekTotal,
      count: last7.reduce((s, d) => s + d.count, 0),
      prevCount: prev7.reduce((s, d) => s + d.count, 0),
      bestDay: maxOf(last7),
      prevBestDay: maxOf(prev7),
      avgPerDay: weekTotal / 7,
    },
  };
}