import moment from 'moment';
import { formatVET } from '@/lib/vetTime';
import { LOCATION_LABEL } from '@/lib/stockHelpers';

const VET = -240; // Caracas UTC-4

export const PERIODS = [
  { value: 'this_week', label: 'Esta Semana' },
  { value: 'last_week', label: 'Semana Pasada' },
  { value: 'this_month', label: 'Este Mes' },
  { value: 'last_month', label: 'Mes Pasado' },
  { value: 'custom', label: 'Rango Personalizado' },
];

/** Rango [inicio, fin] en ISO UTC; semanas de lunes a domingo en hora de Venezuela. */
export function periodRange(period, from, to) {
  const now = moment().utcOffset(VET);
  let start, end;
  if (period === 'this_week') { start = now.clone().startOf('isoWeek'); end = now.clone().endOf('isoWeek'); }
  else if (period === 'last_week') { start = now.clone().subtract(1, 'week').startOf('isoWeek'); end = start.clone().endOf('isoWeek'); }
  else if (period === 'this_month') { start = now.clone().startOf('month'); end = now.clone().endOf('month'); }
  else if (period === 'last_month') { start = now.clone().subtract(1, 'month').startOf('month'); end = start.clone().endOf('month'); }
  else {
    if (!from || !to) return null;
    start = moment.parseZone(`${from}T00:00:00-04:00`);
    end = moment.parseZone(`${to}T23:59:59-04:00`);
  }
  return { start: start.toISOString(), end: end.toISOString(), label: `${start.format('DD/MM/YYYY')} – ${end.format('DD/MM/YYYY')}` };
}

export function groupBySupply(movements, suppliesById) {
  const map = {};
  movements.forEach(m => {
    const g = map[m.supply_id] ||= {
      supply_id: m.supply_id, name: m.supply_name, unit: m.unit,
      category: suppliesById[m.supply_id]?.category || m.category || '—',
      quantity: 0, cost: 0, uses: 0, movements: [],
      stock: suppliesById[m.supply_id]?.stock_current ?? null,
    };
    g.quantity += Math.abs(m.quantity_change || 0);
    g.cost += m.total_cost || 0;
    g.uses += 1;
    g.movements.push(m);
  });
  Object.values(map).forEach(g => g.movements.sort((a, b) => String(a.created_date).localeCompare(String(b.created_date))));
  return Object.values(map);
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const num = (v) => (Number(v) || 0).toFixed(2);

export function exportConsumptionCSV(groups, rangeLabel) {
  const lines = [
    [esc('Reporte de Consumo de Insumos'), esc(rangeLabel)].join(','),
    '',
    ['Insumo', 'Categoría', 'Cantidad Total', 'Unidad', 'Costo Total ($)', 'Nº de Usos', 'Stock Actual'].map(esc).join(','),
    ...groups.map(g => [esc(g.name), esc(g.category), num(g.quantity), esc(g.unit), num(g.cost), g.uses, g.stock == null ? '' : num(g.stock)].join(',')),
    '',
    ['Fecha/Hora (VE)', 'Insumo', 'Origen', 'Cantidad', 'Unidad', 'Ubicación', 'Saldo antes', 'Saldo después', 'Costo ($)'].map(esc).join(','),
    ...groups.flatMap(g => g.movements.map(m => [
      esc(formatVET(m.created_date)), esc(m.supply_name), esc(m.reference_label), num(m.quantity_change), esc(m.unit),
      esc(LOCATION_LABEL[m.location] || ''), num(m.stock_before), num(m.stock_after), num(m.total_cost),
    ].join(','))),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `consumo-insumos-${moment().format('YYYYMMDD-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}