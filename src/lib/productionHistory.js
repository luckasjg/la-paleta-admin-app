// Historial combinado: lotes maestros (registro dedicado o reconstruidos desde bandejas) + producciones independientes.
const sum = (list, key) => list.reduce((s, x) => s + (Number(x[key]) || 0), 0);
export const gramsOf = (lines = []) => lines.filter(l => l.unit === 'g').reduce((s, l) => s + (l.quantity || 0), 0);

export function buildHistory({ events, trays, batches, independents = [] }) {
  const trayById = Object.fromEntries(trays.map(t => [t.id, t]));
  const batchByCode = Object.fromEntries(batches.map(b => [b.batch_code, b]));
  const indCodes = new Set(independents.map(b => b.batch_code));
  const groups = {};
  const singles = [];

  events.forEach(e => {
    if (e.independent_batch_id && indCodes.has(e.independent_batch_id)) return; // lo cubre el registro del lote
    const tray = trayById[e.tray_id];
    // Lotes antiguos sin registro dedicado: se reconocen por la bandeja nacida de ellos
    const legacyCode = e.type === 'nueva' && tray?.master_batch_id && !batchByCode[tray.master_batch_id] ? tray.master_batch_id : null;
    const code = e.master_batch_id || legacyCode;
    if (code) (groups[code] ||= []).push({ e, tray });
    else singles.push({ kind: 'single', id: e.id, date: e.date, at: e.created_date, event: e, tray });
  });
  batches.forEach(b => { groups[b.batch_code] ||= []; });

  const masters = Object.entries(groups).map(([code, list]) => {
    const b = batchByCode[code];
    if (b) {
      return {
        kind: 'master', id: code, legacy: false, date: b.date, at: b.produced_at || b.created_date,
        base_name: b.base_name, base_recipe_id: b.base_recipe_id, deduction_log: b.deduction_log || [], multiplier: b.multiplier, base_grams: b.base_weight_grams,
        total_cost: b.total_cost, net_loss: b.net_loss_grams, physical: b.physical_grams, branches: b.branches || [],
      };
    }
    const branches = list.map(({ e, tray }) => ({
      tray_id: e.tray_id, recipe_name: e.recipe_name, mode: e.type,
      base_grams: tray?.base_grams_used, variegatos_grams: tray ? gramsOf(tray.variegatos_used) : null,
      net_grams: e.grams, loss_grams: tray?.process_loss_grams,
      cost_total: tray?.real_cost_total, cost_per_gram: tray?.real_cost_per_gram,
    }));
    const first = list[0];
    return {
      kind: 'master', id: code, legacy: true, date: first?.e.date, at: first?.e.created_date,
      base_name: first?.tray?.master_base_name || 'Base Maestra', multiplier: first?.tray?.batch_multiplier,
      base_grams: sum(branches, 'base_grams'), total_cost: sum(branches, 'cost_total'),
      net_loss: sum(branches, 'loss_grams'), physical: sum(branches, 'net_grams'), branches,
    };
  });

  const indItems = independents.map(b => ({
    kind: 'independent', id: b.batch_code, date: b.date, at: b.produced_at || b.created_date,
    recipe_name: b.recipe_name, multiplier: b.multiplier, outputs: b.outputs || [], operator: b.operator,
    theoretical: b.theoretical_grams, physical: b.physical_grams, leftover: b.machine_leftover_grams || 0,
    leftover_destination: b.leftover_destination, loss: b.process_loss_grams, loss_pct: b.process_loss_pct,
    total_cost: b.total_cost, cost_per_gram: b.cost_per_gram, deduction_log: b.deduction_log || [],
  }));

  return [...masters, ...indItems, ...singles].sort((a, b) => String(b.at || b.date || '').localeCompare(String(a.at || a.date || '')));
}

export function filterHistory(items, { date, type, search }) {
  const q = search.trim().toLowerCase();
  return items.filter(it => {
    if (date && it.date !== date) return false;
    if (type === 'maestros' && it.kind !== 'master') return false;
    if (type === 'independientes' && it.kind === 'master') return false;
    if (!q) return true;
    const names = it.kind === 'master'
      ? [it.base_name, ...it.branches.map(b => b.recipe_name)]
      : it.kind === 'independent' ? [it.recipe_name] : [it.event.recipe_name, it.event.source_recipe_name];
    return names.some(n => (n || '').toLowerCase().includes(q));
  });
}