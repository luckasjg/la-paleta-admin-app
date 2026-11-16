import { startOfWeek, addDays, format } from 'date-fns';

// Semana lunes→domingo: clave = fecha (YYYY-MM-DD) del lunes
export const weekKeyOf = (date) => format(startOfWeek(new Date(`${date}T12:00:00`), { weekStartsOn: 1 }), 'yyyy-MM-dd');
export const weekLabel = (key) => {
  const mon = new Date(`${key}T12:00:00`);
  return `${format(mon, 'dd/MM/yyyy')} – ${format(addDays(mon, 6), 'dd/MM/yyyy')}`;
};

export function weeksOf(items) {
  const keys = new Set(items.filter(it => it.date).map(it => weekKeyOf(it.date)));
  return [...keys].sort().reverse();
}

const n = (v) => (v == null || v === '' ? '' : Math.round(Number(v) * 100) / 100);
const esc = (v) => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const HEAD = ['Semana', 'Fecha', 'Tipo', 'Lote', 'Base', 'Sabor', 'Modo', 'Gramos base', 'Gramos variegatos', 'Gramos netos', 'Merma g', 'Costo total', 'Costo por g'];

export function buildProductionCsv(items, weekKeys) {
  const sel = new Set(weekKeys);
  const rows = [];
  items.filter(it => it.date && sel.has(weekKeyOf(it.date)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach(it => {
      const wk = weekLabel(weekKeyOf(it.date));
      if (it.kind === 'master') {
        (it.branches.length ? it.branches : [{}]).forEach(b => rows.push([wk, it.date, 'Lote maestro', it.id, it.base_name, b.recipe_name, b.mode,
          n(b.base_grams), n(b.variegatos_grams), n(b.net_grams), n(b.loss_grams), n(b.cost_total), n(b.cost_per_gram)]));
      } else {
        const e = it.event, t = it.tray;
        rows.push([wk, it.date, 'Independiente', '', '', e.recipe_name, e.type === 'transferencia' ? `transferencia desde ${e.source_recipe_name || ''}` : e.type,
          '', '', n(e.grams), n(t?.process_loss_grams), n(t?.real_cost_total), n(t?.real_cost_per_gram)]);
      }
    });
  return [HEAD, ...rows].map(r => r.map(esc).join(',')).join('\n');
}

export function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}