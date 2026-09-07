import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Factory, Pencil, Trash2, Package, AlertTriangle, CheckCircle2, Info, Store, Search, X } from 'lucide-react';
import VitrineTrayCard from '@/components/production/VitrineTrayCard';
import ReserveTrayCard from '@/components/production/ReserveTrayCard';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { getStockAt, buildStockDelta, LOCATION_LABEL } from '@/lib/stockHelpers';
import IngredientCheckList from '@/components/production/IngredientCheckList';
import { buildIngredientPlan, computeRealCost, SUBSTITUTION_REASON } from '@/lib/productionSubstitutes';

export default function Production() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [grams, setGrams] = useState(5000);
  // Bypass de descuento de inventario para carga inicial / ajuste de saldo.
  // NOTA RBAC: hoy la ruta /produccion está protegida por RequireAdmin, así que
  // sólo admins ven este switch. Cuando exista el rol ENCARGADO_PRODUCCION,
  // envolver el bloque del Switch en {canUseBypass && (...)} para ocultarlo.
  const [skipInventoryDeduction, setSkipInventoryDeduction] = useState(false);
  // Origen de Materia Prima: 'production' (Laboratorio) por defecto, o 'warehouse' (Almacén).
  const [sourceLocation, setSourceLocation] = useState('production');
  // Destino de la producción: 'new' (bandeja nueva) o el id de una bandeja activa a completar
  const [targetTrayId, setTargetTrayId] = useState('new');
  const [editTray, setEditTray] = useState(null); // tray being edited
  const [editForm, setEditForm] = useState({ recipe_id: '', recipe_name: '', remaining_grams: 0 });
  const [depositSearch, setDepositSearch] = useState('');
  // Sustituciones de insumos elegidas por el operario: índice de ingrediente → { supply_id, save_preferred }
  const [substitutions, setSubstitutions] = useState({});
  const [consumableDialog, setConsumableDialog] = useState(false);
  const [selectedUtensil, setSelectedUtensil] = useState('');
  const qc = useQueryClient();

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.list('-created_date', 50),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const iceRecipes = recipes.filter(r => r.type === 'helado');

  // Bandejas activas del mismo sabor que pueden completarse con el helado nuevo
  const refillableTrays = trays.filter(
    t => t.status === 'activa' && (t.recipe_id === recipeId || (!t.recipe_id && t.recipe_name === recipes.find(r => r.id === recipeId)?.name))
  );

  // Escribe la bandeja: crea una nueva o completa una existente (mismo sabor)
  const commitTray = async (recipe, gramsToAdd, cost = null, subs = []) => {
    const today = moment().format('YYYY-MM-DD');
    const target = targetTrayId !== 'new' ? trays.find(t => t.id === targetTrayId) : null;

    if (target) {
      const totalGrams = (target.initial_grams || 0) + gramsToAdd;
      const costTotal = (target.real_cost_total || 0) + (cost || 0);
      await base44.entities.Tray.update(target.id, {
        remaining_grams: (target.remaining_grams || 0) + gramsToAdd,
        initial_grams: totalGrams,
        status: 'activa',
        production_date: today,
        first_production_date: target.first_production_date || target.production_date || today,
        refill_count: (target.refill_count || 0) + 1,
        last_refill_date: today,
        real_cost_total: costTotal,
        real_cost_per_gram: totalGrams > 0 ? costTotal / totalGrams : 0,
        substitutions: [...(target.substitutions || []), ...subs],
      });
      return { refilled: true, name: target.recipe_name };
    }

    await base44.entities.Tray.create({
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      remaining_grams: gramsToAdd,
      initial_grams: gramsToAdd,
      status: 'activa',
      production_date: today,
      first_production_date: today,
      refill_count: 0,
      real_cost_total: cost || 0,
      real_cost_per_gram: gramsToAdd > 0 ? (cost || 0) / gramsToAdd : 0,
      substitutions: subs,
    });
    return { refilled: false, name: recipe.name };
  };

  // Resolve an ingredient to its current Supply: first by id, then fallback by name
  // (case-insensitive). This handles cases where a Supply was re-created (e.g. a
  // Preparation's linked supply) and the old id stored in the recipe is now stale.
  const resolveSupply = React.useCallback((ing) => {
    if (!ing) return null;
    let supply = ing.supply_id ? supplies.find(s => s.id === ing.supply_id) : null;
    if (!supply && ing.supply_name) {
      const target = ing.supply_name.trim().toLowerCase();
      supply = supplies.find(s => (s.name || '').trim().toLowerCase() === target);
    }
    return supply || null;
  }, [supplies]);

  // Plan de consumo del diálogo (receta + gramos + sustituciones elegidas).
  // El stock disponible se mide ESTRICTAMENTE en la ubicación de origen seleccionada.
  const selectedRecipe = recipes.find(r => r.id === recipeId);
  const ingredientPlan = React.useMemo(
    () => buildIngredientPlan({
      recipe: selectedRecipe,
      grams,
      supplies,
      sourceLocation,
      substitutions,
      resolveSupply,
    }),
    [selectedRecipe, grams, supplies, sourceLocation, substitutions, resolveSupply]
  );

  const realCost = React.useMemo(() => computeRealCost(ingredientPlan), [ingredientPlan]);
  const missingIngredients = ingredientPlan.filter(i => i.missing);

  const selectSubstitute = (index, supplyId) =>
    setSubstitutions(prev => ({ ...prev, [index]: { supply_id: supplyId, save_preferred: false } }));
  const clearSubstitute = (index) =>
    setSubstitutions(prev => { const next = { ...prev }; delete next[index]; return next; });
  const togglePreferred = (index, value) =>
    setSubstitutions(prev => ({ ...prev, [index]: { ...prev[index], save_preferred: value } }));
  // En modo bypass (carga inicial) no se valida disponibilidad de materia prima.
  const canProduce = recipeId && grams > 0 && (skipInventoryDeduction || missingIngredients.length === 0);

  const produce = useMutation({
    mutationFn: async () => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) throw new Error('Receta no encontrada');

      // BYPASS MODE — Carga Inicial / Ajuste de Saldo:
      // Crea la bandeja directamente sin tocar la materia prima.
      if (skipInventoryDeduction) {
        const res = await commitTray(recipe, grams);
        return { skipped: true, ...res };
      }

      // 1:1 ratio: peso real procesado = peso final de la bandeja (sin overrun, sin conversión a volumen)
      const ingredients = recipe.ingredients || [];
      const plan = ingredientPlan;

      // Final validation (defensive — UI already blocks this).
      // Validamos contra el stock de la ubicación de origen elegida.
      const missing = plan
        .filter(row => row.missing)
        .map(row =>
          row.effective
            ? `${row.effective.name}: faltan ${(row.needed - row.available).toFixed(0)}${row.unit} en ${LOCATION_LABEL[sourceLocation]}`
            : `${row.originalName} (no existe en inventario)`
        );
      if (missing.length > 0) {
        throw new Error(`Insumos insuficientes — ${missing.join(' · ')}`);
      }

      // Persistir ids frescos en la receta: auto-heal por nombre + sustitutos marcados
      // como "preferido" por el operario.
      const needsRecipeUpdate = plan.some(
        row => row.relinked || (row.isSubstituted && row.savePreferred)
      );
      if (needsRecipeUpdate) {
        const fixedIngredients = ingredients.map((ing, i) => {
          const row = plan[i];
          if (!row) return ing;
          if (row.isSubstituted && row.savePreferred) {
            return { ...ing, supply_id: row.substitute.id, supply_name: row.substitute.name, unit: row.substitute.unit };
          }
          if (row.relinked) {
            return { ...ing, supply_id: row.original.id, supply_name: row.original.name, unit: row.original.unit };
          }
          return ing;
        });
        await base44.entities.Recipe.update(recipe.id, { ingredients: fixedIngredients });
      }

      // Deduct supplies (skip infinite ones) from the SELECTED location.
      for (const row of plan) {
        if (!row.effective || row.effective.is_infinite) continue;
        await base44.entities.Supply.update(
          row.effective.id,
          buildStockDelta(row.effective, sourceLocation, -row.needed)
        );
      }

      // Trazabilidad de cada sustitución aplicada
      const subs = plan.filter(row => row.isSubstituted);
      if (subs.length > 0) {
        await base44.entities.InventoryAdjustment.bulkCreate(
          subs.map(row => ({
            type: 'supply',
            reference_id: row.substitute.id,
            reference_name: row.substitute.name,
            quantity_change: -row.needed,
            reason: SUBSTITUTION_REASON,
            notes: `${recipe.name}: ${row.originalName} → ${row.substitute.name} (${row.needed.toFixed(1)}${row.unit})`,
          }))
        );
      }

      // Bandeja nueva o completar existente — 1:1 con el peso real procesado
      return await commitTray(
        recipe,
        grams,
        computeRealCost(plan),
        subs.map(row => ({
          original_supply_id: row.original?.id || '',
          original_supply_name: row.originalName,
          substitute_supply_id: row.substitute.id,
          substitute_supply_name: row.substitute.name,
          quantity: row.needed,
          unit: row.unit,
          saved_as_preferred: row.savePreferred === true,
        }))
      );
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      setDialogOpen(false);
      setSkipInventoryDeduction(false);
      setTargetTrayId('new');
      setSubstitutions({});
      const base = result?.refilled
        ? `Bandeja de ${result.name} completada con ${grams}g nuevos.`
        : 'Bandeja nueva registrada.';
      toast.success(
        result?.skipped
          ? `${base} Carga inicial: sin descuento de inventario.`
          : `${base} Insumos descontados.`
      );
    },
    onError: (err) => {
      toast.error(err.message, { duration: 8000 });
    },
  });

  const utensilios = supplies.filter(s => s.sector === 'utensilio');

  const updateTray = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Tray.update(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      setEditTray(null);
      toast.success('Bandeja actualizada');
    },
  });

  const deleteTray = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Tray.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      toast.success('Bandeja eliminada');
    },
  });

  const registerConsumable = useMutation({
    mutationFn: async () => {
      const utensil = supplies.find(s => s.id === selectedUtensil);
      if (!utensil) throw new Error('Utensilio no encontrado');
      const avail = getStockAt(utensil, sourceLocation);
      if (avail < 1) throw new Error(`Sin stock de ${utensil.name} en ${LOCATION_LABEL[sourceLocation]}`);
      await base44.entities.Supply.update(
        utensil.id,
        buildStockDelta(utensil, sourceLocation, -1)
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      setConsumableDialog(false);
      setSelectedUtensil('');
      toast.success('Paquete registrado como gastado');
    },
    onError: (err) => toast.error(err.message),
  });

  const openEditTray = (t) => {
    setEditTray(t);
    setEditForm({ recipe_id: t.recipe_id || '', recipe_name: t.recipe_name, remaining_grams: t.remaining_grams || 0 });
  };

  const handleEditSave = () => {
    const recipe = recipes.find(r => r.id === editForm.recipe_id);
    updateTray.mutate({
      id: editTray.id,
      data: {
        recipe_id: editForm.recipe_id,
        recipe_name: recipe ? recipe.name : editForm.recipe_name,
        remaining_grams: parseFloat(editForm.remaining_grams) || 0,
      },
    });
  };

  const setVitrine = useMutation({
    mutationFn: async ({ id, value }) => {
      await base44.entities.Tray.update(id, { in_vitrine: value });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trays'] }),
  });

  const exhaustTray = useMutation({
    mutationFn: async (tray) => {
      await base44.entities.Tray.update(tray.id, {
        status: 'agotada',
        in_vitrine: false,
        remaining_grams: 0,
        closed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      toast.success('Bandeja marcada como agotada y retirada de vitrina');
    },
  });

  const activeTrays = trays.filter(t => t.status === 'activa');
  const exhaustedTrays = trays.filter(t => t.status === 'agotada');
  const byOldest = (a, b) => String(a.production_date || '').localeCompare(String(b.production_date || ''));
  const vitrineTrays = activeTrays.filter(t => t.in_vitrine).sort(byOldest);
  const allReserveTrays = activeTrays.filter(t => !t.in_vitrine);
  const reserveTrays = allReserveTrays
    .filter(t => (t.recipe_name || '').toLowerCase().includes(depositSearch.trim().toLowerCase()))
    .sort((a, b) => (a.recipe_name || '').localeCompare(b.recipe_name || '', 'es', { sensitivity: 'base' }));
  const mutating = setVitrine.isPending || exhaustTray.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción"
        description="Registro de bandejas y control de producción"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConsumableDialog(true)}>
              <Package className="h-4 w-4 mr-2" /> Registrar Paquete Gastado
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Producir Bandeja
            </Button>
          </div>
        }
      />

      {/* Vitrina — destacada */}
      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> En Vitrina
          </h2>
          <Badge variant="secondary">{vitrineTrays.length} de {activeTrays.length} activas</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vitrineTrays.map(t => (
            <VitrineTrayCard
              key={t.id}
              tray={t}
              busy={mutating}
              onEdit={openEditTray}
              onExhaust={(tray) => exhaustTray.mutate(tray)}
              onDemote={(tray) => setVitrine.mutate({ id: tray.id, value: false })}
            />
          ))}
          {vitrineTrays.length === 0 && (
            <Card className="col-span-full p-8 flex flex-col items-center text-center bg-card">
              <Store className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">No hay bandejas en vitrina. Sube una desde el depósito.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Depósito / Reserva */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
            <Package className="h-4 w-4" /> Depósito ({reserveTrays.length}
            {depositSearch.trim() ? ` de ${allReserveTrays.length}` : ''})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={depositSearch}
              onChange={e => setDepositSearch(e.target.value)}
              placeholder="Buscar sabor..."
              className="pl-9 pr-9"
            />
            {depositSearch && (
              <button
                type="button"
                onClick={() => setDepositSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Limpiar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {reserveTrays.map(t => (
            <ReserveTrayCard
              key={t.id}
              tray={t}
              busy={mutating}
              onEdit={openEditTray}
              onDelete={(id) => deleteTray.mutate(id)}
              onPromote={(tray) => setVitrine.mutate({ id: tray.id, value: true })}
            />
          ))}
          {reserveTrays.length === 0 && (
            <Card className="col-span-full p-6 flex flex-col items-center text-center">
              <Factory className="h-7 w-7 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">
                {depositSearch.trim()
                  ? `Ningún sabor coincide con "${depositSearch}"`
                  : 'Sin bandejas en depósito'}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Exhausted trays */}
      {exhaustedTrays.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Bandejas Agotadas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {exhaustedTrays.slice(0, 8).map(t => (
              <Card key={t.id} className="p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.recipe_name}</span>
                  <Badge variant="secondary">Agotada</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.production_date && moment(t.production_date).format('DD/MM/YY')}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Tray Dialog */}
      <Dialog open={!!editTray} onOpenChange={() => setEditTray(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Bandeja — {editTray?.recipe_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Sabor (Receta)</Label>
              <Select value={editForm.recipe_id} onValueChange={v => setEditForm(f => ({ ...f, recipe_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sabor" /></SelectTrigger>
                <SelectContent>{iceRecipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gramos restantes</Label>
              <Input
                type="number"
                value={editForm.remaining_grams}
                onChange={e => setEditForm(f => ({ ...f, remaining_grams: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTray(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={updateTray.isPending}>
              {updateTray.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consumable Dialog */}
      <Dialog open={consumableDialog} onOpenChange={setConsumableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Paquete Gastado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="text-sm text-muted-foreground">Selecciona el utensilio consumido. Se descontará 1 unidad del stock en la ubicación elegida.</p>
            <StockLocationSelector value={sourceLocation} onChange={setSourceLocation} />
            <div>
              <Label>Utensilio</Label>
              <Select value={selectedUtensil} onValueChange={setSelectedUtensil}>
                <SelectTrigger><SelectValue placeholder="Seleccionar utensilio..." /></SelectTrigger>
                <SelectContent>
                  {utensilios.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {LOCATION_LABEL[sourceLocation]}: {getStockAt(s, sourceLocation)} {s.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsumableDialog(false)}>Cancelar</Button>
            <Button onClick={() => registerConsumable.mutate()} disabled={!selectedUtensil || registerConsumable.isPending}>
              {registerConsumable.isPending ? 'Registrando...' : 'Registrar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Produce Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setSkipInventoryDeduction(false); setSubstitutions({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producir Bandeja de Helado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Switch: Carga Inicial / Ajuste de Saldo (bypass de descuento) */}
            <div className={`rounded-lg border p-3 flex items-center gap-3 ${
              skipInventoryDeduction
                ? 'bg-amber-50 border-amber-400'
                : 'bg-muted/40 border-border'
            }`}>
              <Switch
                id="bypass-tray"
                checked={skipInventoryDeduction}
                onCheckedChange={setSkipInventoryDeduction}
              />
              <Label htmlFor="bypass-tray" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium block leading-tight">
                  Carga Inicial / Ajuste de Saldo
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Info className="h-3 w-3" />
                  No descontar Materia Prima
                </span>
              </Label>
            </div>

            <div>
              <Label>Sabor (Receta)</Label>
              <SearchableCombobox
                value={recipeId}
                onChange={(v) => { setRecipeId(v); setTargetTrayId('new'); setSubstitutions({}); }}
                options={iceRecipes.map(r => ({ value: r.id, label: r.name }))}
                placeholder="Seleccionar sabor"
                searchPlaceholder="Buscar sabor..."
                emptyText="Ningún sabor coincide"
              />
            </div>

            {recipeId && refillableTrays.length > 0 && (
              <div>
                <Label>Destino de la producción</Label>
                <Select value={targetTrayId} onValueChange={setTargetTrayId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Bandeja nueva</SelectItem>
                    {refillableTrays.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        Completar bandeja — quedan {(t.remaining_grams || 0).toFixed(0)}g (prod. {t.production_date ? moment(t.production_date).format('DD/MM') : '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetTrayId !== 'new' && (
                  <p className="text-xs text-amber-700 mt-1">
                    Se sumarán {grams || 0}g al helado que ya tiene esa bandeja y quedará marcada como rellenada.
                  </p>
                )}
              </div>
            )}

            {!skipInventoryDeduction && (
              <StockLocationSelector value={sourceLocation} onChange={setSourceLocation} />
            )}

            <div>
              <Label>Peso Neto a producir (g)</Label>
              <Input type="number" value={grams} onChange={e => setGrams(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">La bandeja se creará con exactamente {grams || 0}g (relación 1:1).</p>
            </div>

            {/* Ingredient check — oculto en modo bypass */}
            {!skipInventoryDeduction && selectedRecipe && grams > 0 && (
              <IngredientCheckList
                plan={ingredientPlan}
                sourceLocation={sourceLocation}
                realCost={realCost}
                onSelectSubstitute={selectSubstitute}
                onClearSubstitute={clearSubstitute}
                onTogglePreferred={togglePreferred}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => produce.mutate()} disabled={!canProduce || produce.isPending}>
              {produce.isPending ? 'Produciendo...' : (skipInventoryDeduction ? 'Registrar Carga Inicial' : 'Producir')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}