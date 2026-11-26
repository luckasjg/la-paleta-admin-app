// Persistencia del lote independiente: bandejas, descuento consolidado, eventos y registro del lote.
import moment from 'moment';
import { displayName } from '@/lib/displayName';
import { base44 } from '@/api/base44Client';
import { SUBSTITUTION_REASON, toVariationRecord } from '@/lib/productionSubstitutes';
import { deductWithLog } from '@/lib/deductionLog';
import { weightOf } from '@/lib/independentBatch';

/** Crea una bandeja nueva o rellena una existente (costo por gramo promedio ponderado). */
async function writeTray({ recipe, output, cost, fields, subs, existingTrays, today }) {
  const net = output.net;
  if (output.mode === 'relleno') {
    const target = existingTrays.find(t => t.id === output.target_tray_id);
    if (!target) throw new Error('La bandeja a rellenar ya no existe.');
    const before = output.before || 0;
    const after = before + net;
    const weighted = before * (target.real_cost_per_gram || 0) + cost;
    await base44.entities.Tray.update(target.id, {
      ...fields,
      remaining_grams: after, initial_grams: after, status: 'activa', production_date: today,
      first_production_date: target.first_production_date || target.production_date || today,
      refill_count: (target.refill_count || 0) + 1, last_refill_date: today,
      real_cost_total: weighted, real_cost_per_gram: after > 0 ? weighted / after : 0,
      refill_log: [...(target.refill_log || []), {
        ...fields, date: today, grams_added: net, cost, cost_per_gram: net > 0 ? cost / net : 0,
        remaining_before: before, remaining_after: after, substitutions: subs,
      }],
    });
    return { trayId: target.id, before, after, mode: 'relleno' };
  }
  const created = await base44.entities.Tray.create({
    ...fields, recipe_id: recipe.id, recipe_name: recipe.name,
    remaining_grams: net, initial_grams: net, status: 'activa',
    production_date: today, first_production_date: today, refill_count: 0,
    real_cost_total: cost, real_cost_per_gram: net > 0 ? cost / net : 0,
    substitutions: subs, refill_log: [],
  });
  return { trayId: created?.id, before: 0, after: net, mode: 'nueva' };
}

const notify = (date) =>
  base44.functions.invoke('notifySlackProductionDay', { date }).catch(e => console.error('Slack producción:', e));

export async function saveIndependentBatch({
  recipe, plan, computed, balance, deductions, multiplier, sourceLocation, leftoverDestination, existingTrays, supplies, bypass,
}) {
  const today = moment().format('YYYY-MM-DD');
  const me = await base44.auth.me().catch(() => null);
  const operator = displayName(me);

  // Carga inicial / ajuste de saldo: bandejas sin descuento de materia prima
  if (bypass) {
    const results = [];
    for (const c of computed) {
      results.push(await writeTray({ recipe, output: c.output, cost: 0, fields: {}, subs: [], existingTrays, today }));
    }
    await base44.entities.TrayEvent.bulkCreate(results.map((r, i) => ({
      type: r.mode, date: today, tray_id: r.trayId, recipe_name: recipe.name, grams: computed[i].output.net,
      remaining_before: r.before, remaining_after: r.after, operator, production_ref: '', inventory_bypass: true,
    })));
    notify(today);
    return { count: results.length, bypass: true };
  }

  if (deductions.missing.length) throw new Error('Insumos insuficientes para el lote.');
  const batchId = `LI-${moment().format('YYYYMMDD-HHmmss')}`;
  const subs = plan.filter(r => r.isSubstituted && r.needed > 0);
  const subsLog = subs.map(r => ({
    original_supply_id: r.original?.id || '', original_supply_name: r.originalName,
    substitute_supply_id: r.substitute.id, substitute_supply_name: r.substitute.name,
    quantity: r.needed, unit: r.unit, saved_as_preferred: r.savePreferred === true,
  }));
  const variations = plan.filter(r => r.variation).map(r => toVariationRecord(r, supplies));

  const details = computed.map(c => {
    const net = c.output.net;
    const varUsed = c.lines.map(l => ({
      supply_id: l.supply?.id || l.ing.supply_id || '', supply_name: l.name,
      planned_quantity: l.planned, quantity: l.quantity, unit: l.unit, is_extra: l.isExtra,
    }));
    const lossShare = balance.useful > 0 ? (balance.loss * net) / balance.useful : 0;
    return {
      output: c.output, net, varUsed, lossShare, cost: net * balance.costPerGram,
      fields: { production_ref: batchId, batch_multiplier: multiplier, process_loss_grams: lossShare, variegatos_used: varUsed, ingredient_variations: variations },
    };
  });

  // 1. Bandejas (si falla aquí, el inventario no se tocó)
  for (const d of details) {
    Object.assign(d, await writeTray({ recipe, output: d.output, cost: d.cost, fields: d.fields, subs: subsLog, existingTrays, today }));
  }

  // 2. Descuento consolidado del mix + variegados
  const deductionLog = await deductWithLog(deductions.list, {
    location: sourceLocation, referenceId: batchId, origin: 'helados', referenceLabel: `Lote Independiente: ${recipe.name}`,
  });
  if (subs.length) {
    await base44.entities.InventoryAdjustment.bulkCreate(subs.map(r => ({
      type: 'supply', reference_id: r.substitute.id, reference_name: r.substitute.name, quantity_change: -r.needed,
      reason: SUBSTITUTION_REASON, notes: `${recipe.name} (lote ${batchId}): ${r.originalName} → ${r.substitute.name} (${r.needed.toFixed(1)}${r.unit})`,
    })));
  }
  if (plan.some(r => r.relinked || (r.isSubstituted && r.savePreferred))) {
    await base44.entities.Recipe.update(recipe.id, {
      ingredients: (recipe.ingredients || []).map((ing, i) => {
        const r = plan[i];
        if (r?.isSubstituted && r.savePreferred) return { ...ing, supply_id: r.substitute.id, supply_name: r.substitute.name, unit: r.substitute.unit };
        if (r?.relinked) return { ...ing, supply_id: r.original.id, supply_name: r.original.name, unit: r.original.unit };
        return ing;
      }),
    });
  }

  // 3. Eventos + registro del lote
  await base44.entities.TrayEvent.bulkCreate(details.map(d => ({
    type: d.mode, date: today, tray_id: d.trayId, recipe_name: recipe.name, grams: d.net,
    remaining_before: d.before, remaining_after: d.after, operator,
    production_ref: batchId, independent_batch_id: batchId, inventory_bypass: false,
  })));
  await base44.entities.IndependentBatch.create({
    batch_code: batchId, recipe_id: recipe.id, recipe_name: recipe.name, multiplier, source_location: sourceLocation,
    mix_weight_grams: balance.mixWeight, variegatos_grams: balance.varWeight, theoretical_grams: balance.expected,
    physical_grams: balance.useful, machine_leftover_grams: balance.leftover, leftover_destination: leftoverDestination,
    process_loss_grams: balance.loss, process_loss_pct: balance.lossPct,
    total_cost: balance.totalCost, cost_per_gram: balance.costPerGram,
    date: today, produced_at: new Date().toISOString(), operator, deduction_log: deductionLog,
    outputs: details.map(d => ({
      tray_id: d.trayId, mode: d.mode, net_grams: d.net, variegatos_grams: weightOf(d.varUsed), loss_grams: d.lossShare,
      cost_total: d.cost, cost_per_gram: balance.costPerGram, remaining_before: d.before, remaining_after: d.after,
      variegatos_used: d.varUsed.filter(v => v.quantity > 0).map(({ supply_id, supply_name, quantity, unit }) => ({ supply_id, supply_name, quantity, unit })),
    })),
  });
  notify(today);
  return { count: details.length, refills: details.filter(d => d.mode === 'relleno').length };
}