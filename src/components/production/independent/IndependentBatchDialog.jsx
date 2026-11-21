import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Info, AlertTriangle } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import IngredientCheckList from '@/components/production/IngredientCheckList';
import BatchMultiplierInput from '@/components/production/BatchMultiplierInput';
import StepLabel from '@/components/production/StepLabel';
import IndependentOutputCard from '@/components/production/independent/IndependentOutputCard';
import YieldBalancePanel from '@/components/production/independent/YieldBalancePanel';
import { buildIngredientPlan } from '@/lib/productionSubstitutes';
import { LOCATION_LABEL } from '@/lib/stockHelpers';
import { newOutput, buildOutputs, computeBalance, batchDeductions } from '@/lib/independentBatch';
import { saveIndependentBatch } from '@/lib/saveIndependentBatch';

export default function IndependentBatchDialog({ open, onOpenChange, recipes, supplies, resolveSupply, trays }) {
  const qc = useQueryClient();
  const [bypass, setBypass] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [sourceLocation, setSourceLocation] = useState('production');
  const [multiplier, setMultiplier] = useState(1);
  const [substitutions, setSubstitutions] = useState({});
  const [variations, setVariations] = useState({});
  const [outputs, setOutputs] = useState([newOutput()]);
  const [leftover, setLeftover] = useState(0);
  const [destination, setDestination] = useState('merma');

  const independentRecipes = recipes.filter(r => r.type === 'helado' && !r.base_recipe_id && !r.is_master_base);
  const recipe = recipes.find(r => r.id === recipeId);
  const activeTrays = trays.filter(t => t.status === 'activa' && (t.recipe_id === recipeId || (!t.recipe_id && recipe && t.recipe_name === recipe.name)));

  const plan = useMemo(() => buildIngredientPlan({ recipe, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply }),
    [recipe, multiplier, supplies, sourceLocation, substitutions, variations, resolveSupply]);
  const computed = useMemo(() => buildOutputs({ outputs, recipe, multiplier, sourceLocation, resolveSupply }),
    [outputs, recipe, multiplier, sourceLocation, resolveSupply]);
  const balance = computeBalance({ plan, computed, leftover });
  const deductions = batchDeductions(plan, computed, sourceLocation);

  const targets = outputs.filter(o => o.mode === 'relleno').map(o => o.target_tray_id);
  const refillsValid = targets.every(Boolean) && new Set(targets).size === targets.length;
  const canSave = recipe && outputs.length > 0 && outputs.every(o => o.net > 0) && refillsValid
    && (bypass || (multiplier > 0 && deductions.missing.length === 0));

  const resetBatch = () => {
    setSubstitutions({}); setVariations({}); setMultiplier(1); setOutputs([newOutput()]); setLeftover(0); setDestination('merma');
  };
  const close = () => { onOpenChange(false); setBypass(false); setRecipeId(''); resetBatch(); };

  const save = useMutation({
    mutationFn: () => saveIndependentBatch({
      recipe, plan, computed, balance, deductions, multiplier, sourceLocation,
      leftoverDestination: destination, existingTrays: trays, supplies, bypass,
    }),
    onSuccess: (res) => {
      ['trays', 'supplies', 'recipes', 'tray_events', 'independent_batches', 'trays_history', 'consumption_report', 'consumption_adjustments']
        .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(res.bypass
        ? `${res.count} bandeja(s) registradas. Carga inicial: sin descuento de inventario.`
        : `Lote de ${recipe.name} registrado: ${res.count} bandeja(s). Insumos descontados.`);
      close();
    },
    onError: (e) => toast.error(e.message, { duration: 8000 }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Producir Bandeja · Lote Independiente</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${bypass ? 'bg-amber-50 border-amber-400' : 'bg-muted/40 border-border'}`}>
            <Switch id="bypass-tray" checked={bypass} onCheckedChange={setBypass} />
            <Label htmlFor="bypass-tray" className="flex-1 cursor-pointer">
              <span className="text-sm font-medium block leading-tight">Carga Inicial / Ajuste de Saldo</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Info className="h-3 w-3" /> No descontar Materia Prima</span>
            </Label>
          </div>

          <div>
            <Label>Sabor (Receta)</Label>
            <SearchableCombobox value={recipeId} onChange={(v) => { setRecipeId(v); resetBatch(); }}
              options={independentRecipes.map(r => ({ value: r.id, label: r.name }))}
              placeholder={independentRecipes.length ? 'Seleccionar sabor' : 'Sin recetas independientes'}
              emptyText="Sin coincidencias. Los sabores derivados y bases se producen desde «Lote de Base Maestra»." />
            <p className="text-[11px] text-muted-foreground mt-1">Solo recetas independientes. Los sabores derivados se producen desde «Lote de Base Maestra».</p>
          </div>

          {!bypass && <StockLocationSelector value={sourceLocation} onChange={setSourceLocation} />}

          {!bypass && recipe && (
            <section className="space-y-3">
              <BatchMultiplierInput value={multiplier} onChange={setMultiplier} quick={[1, 2, 3]} label="Multiplicador de Mix"
                hint="Escala la mezcla base. Admite decimales (ej. 1.5 o 1.85)." />
              <StepLabel n={1} title="Mezcla Base" extra={`${balance.mixWeight.toFixed(0)}g`} />
              <IngredientCheckList plan={plan} supplies={supplies} sourceLocation={sourceLocation} realCost={balance.baseCost}
                onSelectSubstitute={(i, id) => setSubstitutions(p => ({ ...p, [i]: { supply_id: id, save_preferred: false } }))}
                onClearSubstitute={(i) => setSubstitutions(p => { const n = { ...p }; delete n[i]; return n; })}
                onTogglePreferred={(i, v) => setSubstitutions(p => ({ ...p, [i]: { ...p[i], save_preferred: v } }))}
                onVariation={(i, v) => setVariations(p => { const n = { ...p }; if (v) n[i] = v; else delete n[i]; return n; })} />
            </section>
          )}

          {recipe && (
            <section className="space-y-3">
              <StepLabel n={bypass ? 1 : 2} title="Bandejas de Salida" extra={`${outputs.length} bandeja(s)`} />
              {computed.map((c, i) => (
                <IndependentOutputCard key={c.output.key} index={i} output={c.output} lines={c.lines} activeTrays={activeTrays}
                  supplies={supplies} bypass={bypass} costPerGram={balance.costPerGram} canRemove={outputs.length > 1}
                  onChange={(o) => setOutputs(prev => prev.map(x => (x.key === o.key ? o : x)))}
                  onRemove={() => setOutputs(prev => prev.filter(x => x.key !== c.output.key))} />
              ))}
              <Button variant="outline" className="w-full" onClick={() => setOutputs(prev => [...prev, newOutput()])}>
                <Plus className="h-4 w-4 mr-2" /> Agregar Bandeja al Lote
              </Button>
              {!refillsValid && <p className="text-xs text-amber-700">Elige una bandeja activa distinta para cada relleno.</p>}
            </section>
          )}

          {!bypass && recipe && (
            <section className="space-y-3">
              <StepLabel n={3} title="Rendimiento y Sobrante del Lote" />
              <YieldBalancePanel balance={balance} leftover={leftover} destination={destination} onLeftover={setLeftover} onDestination={setDestination} />
            </section>
          )}

          {!bypass && deductions.missing.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-1">
              <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Insumos insuficientes en {LOCATION_LABEL[sourceLocation]}</p>
              {deductions.missing.map((d, i) => <p key={i} className="text-xs">{d.name}: requiere {d.qty.toFixed(1)}{d.unit}{!d.supply && ' (no existe en inventario)'}</p>)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending ? 'Registrando...' : bypass ? 'Registrar Carga Inicial' : 'Confirmar Lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}