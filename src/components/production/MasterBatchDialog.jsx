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
import RemnantActions from '@/components/production/RemnantActions';
import { buildIngredientPlan, computeRealCost, SUBSTITUTION_REASON } from '@/lib/productionSubstitutes';
import { buildStockDelta, LOCATION_LABEL } from '@/lib/stockHelpers';
import { buildDerivedLines, derivedTraySummary, aggregateDeductions, splitEvenly, BALANCE_TOLERANCE_G } from '@/lib/masterBatch';
import { gramsOf } from '@/lib/productionHistory';

export default function MasterBatchDialog({ open, onOpenChange, recipes, supplies, resolveSupply, trays: existingTrays = [] }) {
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
    const pure = base ? [{ value: base.id, label: `★ ${base.name} — Sabor puro`, sublabel: 'Base Maestra sin aditivos' }] : [];
    const linked = flavors.filter(r => r.base_recipe_id === baseId).map(r => ({ value: r.id, label: r.name, sublabel: 'Derivado' }));
    const others = flavors.filter(r => r.base_recipe_id !== baseId).map(r => ({ value: r.id, label: r.name, sublabel: '(otro)' }));
    return [...pure, ...linked, ...others];
  }, [flavors, baseId, base]);

  const plan = useMemo(() => buildIngredientPlan({ recipe: base, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply }),
    [base, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply]);
  const baseWeight = plan.filter(r => (r.unit === 'g' || r.unit === 'ml') && r.variation?.status !== 'omitted').reduce((s, r) => s + r.needed, 0);
  const baseCost = computeRealCost(plan);
  const baseCpg = baseWeight > 0 ? baseCost / baseWeight : 0;

  const computed = trays.map(t => {
    const recipe = recipes.find(r => r.id === t.recipe_id);
    // La Base Maestra pura sale sin insumos propios: su costo es solo base × costo/g
    const lines = recipe?.id === baseId ? [] : buildDerivedLines(recipe, t.base_grams, t.overrides, resolveSupply);
    return { tray: t, recipe, lines, summary: derivedTraySummary({ lines, baseGrams: t.base_grams, baseCpg, net: t.net }) };
  });
  const assigned = trays.reduce((s, t) => s + (t.base_grams || 0), 0);
  const balanced = Math.abs(baseWeight - assigned) <= BALANCE_TOLERANCE_G;

  const deductions = aggregateDeductions([
    ...plan.map(r => ({ supply: r.effective, qty: r.needed, name: r.originalName, unit: r.unit })),
    ...computed.flatMap(c => c.lines.map(l => ({ supply: l.supply, qty: l.quantity, name: l.name, unit: l.unit }))),
  ], sourceLocation);

  const activeFor = (recipeId) => existingTrays.filter(t => t.status === 'activa' && t.recipe_id === recipeId);
  const targets = trays.filter(t => t.mode === 'relleno').map(t => t.target_tray_id);
  const refillsValid = targets.every(Boolean) && new Set(targets).size === targets.length;
  const traysValid = trays.length > 0 && refillsValid && computed.every(c => c.recipe && c.tray.net > 0 && c.tray.base_grams > 0);
  const canSave = base && multiplier > 0 && baseWeight > 0 && traysValid && balanced && deductions.missing.length === 0;

  const redistribute = (list, total = baseWeight) => list.map(t => ({ ...t, base_grams: splitEvenly(total, list.length) }));
  const addTray = () => setTrays(prev => redistribute([...prev, { key: `t${Date.now()}`, recipe_id: '', base_grams: 0, net: 0, overrides: {}, mode: 'nueva', target_tray_id: '', before: 0 }]));
  const remaining = Math.max(0, Math.round((baseWeight - assigned) * 10) / 10);
  const baseActiveTrays = base ? activeFor(base.id) : [];
  // Salida pura de la base con todo el remanente; en relleno se preselecciona la primera bandeja activa
  const addPureTray = (mode) => {
    const target = mode === 'relleno' ? baseActiveTrays[0] : null;
    setTrays(prev => [...prev, {
      key: `t${Date.now()}`, recipe_id: base.id, base_grams: remaining, net: 0, overrides: {},
      mode, target_tray_id: target?.id || '', before: target?.remaining_grams || 0,
    }]);
  };
  const updateTray = (t) => setTrays(prev => prev.map(x => {
    if (x.key !== t.key) return x;
    if (t.recipe_id === baseId && x.recipe_id !== baseId) {
      const others = prev.filter(o => o.key !== t.key).reduce((s, o) => s + (o.base_grams || 0), 0);
      return { ...t, base_grams: Math.max(0, Math.round((baseWeight - others) * 10) / 10) };
    }
    return t;
  }));
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

      const master = { master_batch_id: masterBatchId, master_base_name: base.name };
      const details = computed.map(c => ({
        ...c,
        fields: {
          ...master, batch_multiplier: multiplier, process_loss_grams: c.summary.loss, base_grams_used: c.tray.base_grams,
          ingredient_variations: [
            ...baseVariations,
            ...c.lines.filter(l => l.kind === 'i' && Math.abs(l.quantity - l.planned) > 0.001).map(l => ({
              supply_id: l.supply?.id || l.ing.supply_id || '', supply_name: l.name, status: l.quantity > 0 ? 'adjusted' : 'omitted',
              planned_quantity: l.planned, actual_quantity: l.quantity, unit: l.unit, reason: 'Ajuste en lote maestro',
            })),
          ],
          variegatos_used: c.lines.filter(l => l.kind === 'v').map(l => ({
            supply_id: l.supply?.id || l.ing.supply_id || '', supply_name: l.name, planned_quantity: l.planned, quantity: l.quantity, unit: l.unit, is_extra: false,
          })),
        },
      }));
      const news = details.filter(d => d.tray.mode !== 'relleno');
      const refills = details.filter(d => d.tray.mode === 'relleno');

      // 1. Crear bandejas nuevas y aplicar rellenos (si falla, no se tocó el inventario)
      const created = news.length ? await base44.entities.Tray.bulkCreate(news.map(({ tray, recipe, summary, fields }) => ({
        ...fields, recipe_id: recipe.id, recipe_name: recipe.name,
        remaining_grams: tray.net, initial_grams: tray.net, status: 'activa',
        production_date: today, first_production_date: today, refill_count: 0,
        real_cost_total: summary.totalCost, real_cost_per_gram: summary.costPerGram,
        substitutions: subsLog, refill_log: [],
      }))) : [];
      const createdList = Array.isArray(created) ? created : [];
      news.forEach((d, i) => { d.trayId = createdList[i]?.id; d.before = 0; d.after = d.tray.net; });

      for (const d of refills) {
        const target = existingTrays.find(t => t.id === d.tray.target_tray_id);
        if (!target) throw new Error(`La bandeja a rellenar de ${d.recipe.name} ya no existe.`);
        const before = d.tray.before || 0;
        const after = before + d.tray.net;
        // Costo por gramo = el del lote nuevo; costo total = restante anterior + material añadido
        const prevCost = before * (target.real_cost_per_gram || 0);
        await base44.entities.Tray.update(target.id, {
          ...d.fields,
          remaining_grams: after, initial_grams: after, status: 'activa',
          production_date: today, first_production_date: target.first_production_date || target.production_date || today,
          refill_count: (target.refill_count || 0) + 1, last_refill_date: today,
          real_cost_total: prevCost + d.summary.totalCost, real_cost_per_gram: d.summary.costPerGram,
          refill_log: [...(target.refill_log || []), {
            ...d.fields, date: today, grams_added: d.tray.net, cost: d.summary.totalCost, cost_per_gram: d.summary.costPerGram,
            remaining_before: before, remaining_after: after, substitutions: subsLog,
          }],
        });
        Object.assign(d, { trayId: target.id, before, after });
      }

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

      // 3. Eventos de producción + registro dedicado del lote
      const me = await base44.auth.me().catch(() => null);
      const operator = me?.full_name || me?.email || '';
      await base44.entities.TrayEvent.bulkCreate(details.map(d => ({
        ...master, type: d.tray.mode === 'relleno' ? 'relleno' : 'nueva', date: today, tray_id: d.trayId, recipe_name: d.recipe.name,
        grams: d.tray.net, remaining_before: d.before, remaining_after: d.after, operator,
      })));
      const theoretical = details.reduce((s, d) => s + d.summary.expected, 0);
      const physical = details.reduce((s, d) => s + d.tray.net, 0);
      await base44.entities.MasterBatch.create({
        batch_code: masterBatchId, base_recipe_id: base.id, base_name: base.name, multiplier,
        base_weight_grams: baseWeight, base_cost: baseCost, total_cost: details.reduce((s, d) => s + d.summary.totalCost, 0),
        theoretical_grams: theoretical, physical_grams: physical, net_loss_grams: theoretical - physical,
        date: today, produced_at: new Date().toISOString(), operator,
        branches: details.map(d => ({
          tray_id: d.trayId, recipe_name: d.recipe.name, mode: d.tray.mode === 'relleno' ? 'relleno' : 'nueva',
          base_grams: d.tray.base_grams, variegatos_grams: gramsOf(d.fields.variegatos_used), net_grams: d.tray.net,
          expected_grams: d.summary.expected, loss_grams: d.summary.loss, cost_total: d.summary.totalCost,
          cost_per_gram: d.summary.costPerGram, remaining_before: d.before, remaining_after: d.after,
        })),
      });
      base44.functions.invoke('notifySlackProductionDay', { date: today }).catch(e => console.error('Slack producción:', e));
      return { nuevas: news.length, rellenos: refills.length };
    },
    onSuccess: ({ nuevas, rellenos }) => {
      ['trays', 'supplies', 'recipes', 'tray_events', 'master_batches', 'trays_history'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Lote de ${base.name} registrado: ${nuevas} bandeja(s) nueva(s), ${rellenos} relleno(s).`);
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
              {remaining > BALANCE_TOLERANCE_G && (
                <RemnantActions baseName={base.name} remaining={remaining} canRefill={baseActiveTrays.length > 0} onAdd={addPureTray} />
              )}
              {computed.map((c, i) => (
                <DerivedTrayCard key={c.tray.key} index={i} tray={c.tray} options={options} recipe={c.recipe} lines={c.lines} summary={c.summary}
                  activeTrays={activeFor(c.tray.recipe_id)}
                  isPure={c.tray.recipe_id === baseId}
                  onChange={updateTray} onRemove={() => removeTray(c.tray.key)} />
              ))}
              <Button variant="outline" onClick={addTray} className="w-full"><Plus className="h-4 w-4 mr-2" /> Agregar Salida / Bandeja</Button>
              {!refillsValid && <p className="text-xs text-amber-700">Elige una bandeja activa distinta para cada relleno.</p>}
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
            {save.isPending ? 'Registrando...' : 'Registrar Lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}