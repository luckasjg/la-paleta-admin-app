import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import IngredientCheckList from '@/components/production/IngredientCheckList';
import BatchMultiplierInput from '@/components/production/BatchMultiplierInput';
import DerivedTrayCard from '@/components/production/DerivedTrayCard';
import BaseBalanceBar from '@/components/production/BaseBalanceBar';
import MasterBatchTotals from '@/components/production/MasterBatchTotals';
import { buildIngredientPlan, computeRealCost, SUBSTITUTION_REASON } from '@/lib/productionSubstitutes';
import { buildStockDelta, LOCATION_LABEL } from '@/lib/stockHelpers';
import { buildDerivedLines, derivedTraySummary, aggregateDeductions, splitEvenly, BALANCE_TOLERANCE_G } from '@/lib/masterBatch';

export default function MasterBatchDialog({ open, onOpenChange, recipes, supplies, resolveSupply }) {
  const qc = useQueryClient();
  const [baseId, setBaseId] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [sourceLocation, setSourceLocation] = useState('production');
  const [substitutions, setSubstitutions] = useState({});
  const [variations, setVariations] = useState({});
  const [trays, setTrays] = useState([]);

  const bases = recipes.filter(r => r.is_master_base);
  const base = bases.find(r => r.id === baseId);
  const flavors = recipes.filter(r => r.type === 'helado' && !r.is_master_base);
  const options = useMemo(() => {
    const linked = flavors.filter(r => r.base_recipe_id === baseId).map(r => ({ value: r.id, label: `★ ${r.name}` }));
    const others = flavors.filter(r => r.base_recipe_id !== baseId).map(r => ({ value: r.id, label: r.name, sublabel: '(otro)' }));
    return [...linked, ...others];
  }, [flavors, baseId]);

  const plan = useMemo(() => buildIngredientPlan({ recipe: base, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply }),
    [base, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply]);
  const baseWeight = plan.filter(r => r.unit === 'g').reduce((s, r) => s + r.needed, 0);
  const baseCost = computeRealCost(plan);
  const baseCpg = baseWeight > 0 ? baseCost / baseWeight : 0;

  const computed = trays.map(t => {
    const recipe = recipes.find(r => r.id === t.recipe_id);
    const lines = buildDerivedLines(recipe, t.base_grams, t.overrides, resolveSupply);
    return { tray: t, recipe, lines, summary: derivedTraySummary({ lines, baseGrams: t.base_grams, baseCpg, net: t.net }) };
  });
  const assigned = trays.reduce((s, t) => s + (t.base_grams || 0), 0);
  const balanced = Math.abs(baseWeight - assigned) <= BALANCE_TOLERANCE_G;

  const deductions = aggregateDeductions([
    ...plan.map(r => ({ supply: r.effective, qty: r.needed, name: r.originalName, unit: r.unit })),
    ...computed.flatMap(c => c.lines.map(l => ({ supply: l.supply, qty: l.quantity, name: l.name, unit: l.unit }))),
  ], sourceLocation);

  const traysValid = trays.length > 0 && computed.every(c => c.recipe && c.tray.net > 0 && c.tray.base_grams > 0);
  const canSave = base && multiplier > 0 && baseWeight > 0 && traysValid && balanced && deductions.missing.length === 0;

  const redistribute = (list, total = baseWeight) => list.map(t => ({ ...t, base_grams: splitEvenly(total, list.length) }));
  const addTray = () => setTrays(prev => redistribute([...prev, { key: `t${Date.now()}`, recipe_id: '', base_grams: 0, net: 0, overrides: {} }]));
  const removeTray = (key) => setTrays(prev => redistribute(prev.filter(t => t.key !== key)));

  const reset = () => { setBaseId(''); setMultiplier(1); setSubstitutions({}); setVariations({}); setTrays([]); };
  const close = () => { onOpenChange(false); reset(); };

  const save = useMutation({
    mutationFn: async () => {
      if (!canSave) throw new Error('Revisa el lote: hay datos incompletos o insumos insuficientes.');
      const today = moment().format('YYYY-MM-DD');
      const masterBatchId = `MB-${moment().format('YYYYMMDD-HHmmss')}`;
      const subs = plan.filter(r => r.isSubstituted && r.needed > 0);
      const subsLog = subs.map(r => ({
        original_supply_id: r.original?.id || '', original_supply_name: r.originalName,
        substitute_supply_id: r.substitute.id, substitute_supply_name: r.substitute.name,
        quantity: r.needed, unit: r.unit, saved_as_preferred: r.savePreferred === true,
      }));
      const baseVariations = plan.filter(r => r.variation).map(r => ({
        supply_id: r.effective?.id || r.ing.supply_id || '', supply_name: r.isSubstituted ? r.substitute.name : r.originalName,
        status: r.variation.status, planned_quantity: r.planned, actual_quantity: r.needed, unit: r.unit, reason: r.variation.reason || '',
      }));

      // 1. Crear todas las bandejas primero (si falla, no se tocó el inventario)
      const created = await base44.entities.Tray.bulkCreate(computed.map(({ tray, recipe, lines, summary }) => ({
        recipe_id: recipe.id, recipe_name: recipe.name,
        remaining_grams: tray.net, initial_grams: tray.net, status: 'activa',
        production_date: today, first_production_date: today, refill_count: 0,
        real_cost_total: summary.totalCost, real_cost_per_gram: summary.costPerGram,
        batch_multiplier: multiplier, process_loss_grams: summary.loss,
        master_batch_id: masterBatchId, master_base_name: base.name, base_grams_used: tray.base_grams,
        ingredient_variations: [
          ...baseVariations,
          ...lines.filter(l => l.kind === 'i' && Math.abs(l.quantity - l.planned) > 0.001).map(l => ({
            supply_id: l.supply?.id || l.ing.supply_id || '', supply_name: l.name, status: l.quantity > 0 ? 'adjusted' : 'omitted',
            planned_quantity: l.planned, actual_quantity: l.quantity, unit: l.unit, reason: 'Ajuste en lote maestro',
          })),
        ],
        variegatos_used: lines.filter(l => l.kind === 'v').map(l => ({
          supply_id: l.supply?.id || l.ing.supply_id || '', supply_name: l.name, planned_quantity: l.planned, quantity: l.quantity, unit: l.unit, is_extra: false,
        })),
        substitutions: subsLog, refill_log: [],
      })));

      // 2. Descontar inventario (base una sola vez + aditivos de cada bandeja), agrupado por insumo
      for (const { supply, qty } of deductions.list) {
        await base44.entities.Supply.update(supply.id, buildStockDelta(supply, sourceLocation, -qty));
      }
      if (subs.length > 0) {
        await base44.entities.InventoryAdjustment.bulkCreate(subs.map(r => ({
          type: 'supply', reference_id: r.substitute.id, reference_name: r.substitute.name, quantity_change: -r.needed,
          reason: SUBSTITUTION_REASON, notes: `${base.name} (lote ${masterBatchId}): ${r.originalName} → ${r.substitute.name} (${r.needed.toFixed(1)}${r.unit})`,
        })));
      }
      if (plan.some(r => r.relinked || (r.isSubstituted && r.savePreferred))) {
        await base44.entities.Recipe.update(base.id, {
          ingredients: (base.ingredients || []).map((ing, i) => {
            const r = plan[i];
            if (r?.isSubstituted && r.savePreferred) return { ...ing, supply_id: r.substitute.id, supply_name: r.substitute.name, unit: r.substitute.unit };
            if (r?.relinked) return { ...ing, supply_id: r.original.id, supply_name: r.original.name, unit: r.original.unit };
            return ing;
          }),
        });
      }

      // 3. Eventos de producción
      const me = await base44.auth.me().catch(() => null);
      const createdList = Array.isArray(created) ? created : [];
      await base44.entities.TrayEvent.bulkCreate(computed.map((c, i) => ({
        type: 'nueva', date: today, tray_id: createdList[i]?.id, recipe_name: c.recipe.name,
        grams: c.tray.net, remaining_before: 0, remaining_after: c.tray.net, operator: me?.full_name || me?.email || '',
      })));
      base44.functions.invoke('notifySlackProductionDay', { date: today }).catch(e => console.error('Slack producción:', e));
      return computed.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(`Lote de ${base.name} registrado: ${n} bandeja(s) creadas.`);
      close();
    },
    onError: (e) => toast.error(e.message, { duration: 8000 }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Lote de Base Maestra (Multi-Bandeja)</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paso 1 · Lote maestro</p>
            <div>
              <Label>Base Maestra</Label>
              <SearchableCombobox value={baseId} onChange={(v) => { setBaseId(v); setSubstitutions({}); setVariations({}); setTrays([]); }}
                options={bases.map(b => ({ value: b.id, label: b.name }))} placeholder="Seleccionar base" searchPlaceholder="Buscar base..." emptyText="No hay bases maestras en el recetario" />
            </div>
            <StockLocationSelector value={sourceLocation} onChange={setSourceLocation} />
            {base && (
              <>
                <BatchMultiplierInput value={multiplier} onChange={(m) => { setMultiplier(m); }} />
                <IngredientCheckList plan={plan} sourceLocation={sourceLocation} realCost={baseCost}
                  onSelectSubstitute={(i, id) => setSubstitutions(p => ({ ...p, [i]: { supply_id: id, save_preferred: false } }))}
                  onClearSubstitute={(i) => setSubstitutions(p => { const n = { ...p }; delete n[i]; return n; })}
                  onTogglePreferred={(i, v) => setSubstitutions(p => ({ ...p, [i]: { ...p[i], save_preferred: v } }))}
                  onVariation={(i, v) => setVariations(p => { const n = { ...p }; if (v) n[i] = v; else delete n[i]; return n; })} />
                <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Peso teórico base</p><p className="font-mono font-semibold">{baseWeight.toFixed(1)}g</p></div>
                  <div><p className="text-xs text-muted-foreground">Costo real base</p><p className="font-mono font-semibold">${baseCost.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Costo / g base</p><p className="font-mono font-semibold">${baseCpg.toFixed(4)}</p></div>
                </div>
              </>
            )}
          </section>

          {base && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paso 2 · Bandejas derivadas</p>
              <BaseBalanceBar produced={baseWeight} assigned={assigned} onSplit={trays.length ? () => setTrays(prev => redistribute(prev)) : null} />
              {computed.map((c, i) => (
                <DerivedTrayCard key={c.tray.key} index={i} tray={c.tray} options={options} recipe={c.recipe} lines={c.lines} summary={c.summary}
                  onChange={(t) => setTrays(prev => prev.map(x => (x.key === t.key ? t : x)))} onRemove={() => removeTray(c.tray.key)} />
              ))}
              <Button variant="outline" onClick={addTray} className="w-full"><Plus className="h-4 w-4 mr-2" /> Agregar Bandeja Derivada</Button>
              {computed.length > 0 && <MasterBatchTotals items={computed} />}
            </section>
          )}

          {deductions.missing.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Insumos insuficientes en {LOCATION_LABEL[sourceLocation]}</p>
              {deductions.missing.map((d, i) => <p key={i} className="text-xs">{d.name}: requiere {d.qty.toFixed(1)}{d.unit}{!d.supply && ' (no existe en inventario)'}</p>)}
            </div>
          )}
          {base && trays.length > 0 && !balanced && (
            <p className="text-xs text-amber-700">Debes repartir toda la base producida entre las bandejas para registrar el lote.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? 'Registrando...' : 'Registrar Lote y Crear Bandejas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}