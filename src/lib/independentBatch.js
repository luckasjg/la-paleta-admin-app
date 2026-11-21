// Lote de receta independiente: un mix escalado repartido en varias bandejas de salida.
import { buildVariegatoPlan, computeBatchSummary } from '@/lib/batchProduction';
import { aggregateDeductions } from '@/lib/masterBatch';

export const LEFTOVER_DESTINATIONS = { merma: 'Merma / Lavado', tarrina: 'Envasado aparte / Tarrina' };

export const newOutput = () => ({
  key: `o${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
  mode: 'nueva', target_tray_id: '', before: 0, net: 0, overrides: {}, extras: [],
});

const isWeight = (u) => u === 'g' || u === 'ml';
export const weightOf = (lines = []) => lines.filter(l => isWeight(l.unit)).reduce((s, l) => s + (l.quantity || 0), 0);

/** Variegados por bandeja: los de la receta se reparten en partes iguales entre las salidas. */
export function buildOutputs({ outputs, recipe, multiplier, sourceLocation, resolveSupply }) {
  const share = outputs.length ? (multiplier || 0) / outputs.length : 0;
  return outputs.map(output => ({
    output,
    lines: buildVariegatoPlan({ recipe, multiplier: share, overrides: output.overrides, extras: output.extras, sourceLocation, resolveSupply }),
  }));
}

/** Balance físico: teórico (mix + variegados) vs. útil en bandejas + sobrante en máquina. */
export function computeBalance({ plan, computed, leftover }) {
  const allLines = computed.flatMap(c => c.lines);
  const useful = computed.reduce((s, c) => s + (c.output.net || 0), 0);
  const { baseCost, totalCost, expected } = computeBatchSummary(plan, allLines, useful);
  const varWeight = weightOf(allLines);
  const left = leftover || 0;
  const loss = expected - useful - left;
  return {
    baseCost, totalCost, expected, useful, varWeight,
    mixWeight: expected - varWeight,
    leftover: left,
    loss,
    lossPct: expected > 0 ? (loss / expected) * 100 : 0,
    costPerGram: useful > 0 ? totalCost / useful : 0,
  };
}

/** Descuento consolidado del lote: mix completo + variegados de todas las bandejas. */
export function batchDeductions(plan, computed, location) {
  return aggregateDeductions([
    ...plan.map(r => ({ supply: r.effective, qty: r.needed, name: r.originalName, unit: r.unit })),
    ...computed.flatMap(c => c.lines.map(l => ({ supply: l.supply, qty: l.quantity, name: l.name, unit: l.unit }))),
  ], location);
}