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

/** Desglose de un conjunto de ventas: productos, métodos de pago, horas, días. */
function breakdown(list) {
  const productMap = {};
  const paymentMap = {};
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}:00`, hour: h, ventas: 0, count: 0 }));
  const weekday = DAY_NAMES.map(name => ({ name, ventas: 0, count: 0, dates: new Set() }));
  const shiftMap = { 'Mañana': { ventas: 0, count: 0 }, 'Tarde': { ventas: 0, count: 0 }, 'Noche': { ventas: 0, count: 0 } };

  list.forEach(sale => {
    (sale.items || []).forEach(item => {
      const name = item.flavor || item.product_name;
      if (!name) return;
      if (!productMap[name]) productMap[name] = { name, units: 0, revenue: 0 };
      productMap[name].units += item.quantity || 1;
      productMap[name].revenue += item.subtotal || 0;
    });

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
    products: Object.values(productMap).sort((a, b) => b.units - a.units),
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
      avgPerDay: weekTotal / 7,
    },
  };
}