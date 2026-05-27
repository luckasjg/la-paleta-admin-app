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
import { Plus, Factory, Pencil, Trash2, Package, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';
import StockLocationSelector from '@/components/shared/StockLocationSelector';
import { getStockAt, buildStockDelta, LOCATION_LABEL } from '@/lib/stockHelpers';

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
  const [editTray, setEditTray] = useState(null); // tray being edited
  const [editForm, setEditForm] = useState({ recipe_id: '', recipe_name: '', remaining_grams: 0 });
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

  // Pre-compute ingredient requirements for the dialog (current recipe + grams)
  const selectedRecipe = recipes.find(r => r.id === recipeId);
  const ingredientCheck = React.useMemo(() => {
    if (!selectedRecipe || !grams) return [];
    const multiplier = grams / (selectedRecipe.yield_amount || 1);
    return (selectedRecipe.ingredients || []).map(ing => {
      const supply = resolveSupply(ing);
      const needed = (ing.quantity || 0) * multiplier;
      // El stock disponible se mide ESTRICTAMENTE en la ubicación de origen seleccionada.
      const available = supply ? getStockAt(supply, sourceLocation) : 0;
      const isInfinite = supply?.is_infinite === true;
      const missing = !supply || (!isInfinite && available < needed);
      return {
        name: supply?.name || ing.supply_name || 'Insumo desconocido',
        unit: supply?.unit || ing.unit || '',
        needed,
        available,
        isInfinite,
        missing,
        notFound: !supply,
        relinked: supply && ing.supply_id && supply.id !== ing.supply_id,
      };
    });
  }, [selectedRecipe, grams, supplies, resolveSupply, sourceLocation]);

  const missingIngredients = ingredientCheck.filter(i => i.missing);
  // En modo bypass (carga inicial) no se valida disponibilidad de materia prima.
  const canProduce = recipeId && grams > 0 && (skipInventoryDeduction || missingIngredients.length === 0);

  const produce = useMutation({
    mutationFn: async () => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) throw new Error('Receta no encontrada');

      // BYPASS MODE — Carga Inicial / Ajuste de Saldo:
      // Crea la bandeja directamente sin tocar la materia prima.
      if (skipInventoryDeduction) {
        await base44.entities.Tray.create({
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          remaining_grams: grams,
          initial_grams: grams,
          status: 'activa',
          production_date: moment().format('YYYY-MM-DD'),
        });
        return { skipped: true };
      }

      // 1:1 ratio: peso real procesado = peso final de la bandeja (sin overrun, sin conversión a volumen)
      const multiplier = grams / (recipe.yield_amount || 1);
      const ingredients = recipe.ingredients || [];

      // Resolve each ingredient and detect any that were re-linked by name (stale id)
      const resolved = ingredients.map(ing => ({ ing, supply: resolveSupply(ing) }));
      const relinked = resolved.filter(r => r.supply && r.ing.supply_id && r.supply.id !== r.ing.supply_id);

      // Final validation (defensive — UI already blocks this).
      // Validamos contra el stock de la ubicación de origen elegida.
      const missing = [];
      for (const { ing, supply } of resolved) {
        if (!supply) {
          missing.push(`${ing.supply_name || 'Insumo'} (no existe en inventario)`);
          continue;
        }
        if (supply.is_infinite) continue;
        const needed = (ing.quantity || 0) * multiplier;
        const avail = getStockAt(supply, sourceLocation);
        if (avail < needed) {
          missing.push(`${supply.name}: faltan ${(needed - avail).toFixed(0)}${supply.unit} en ${LOCATION_LABEL[sourceLocation]}`);
        }
      }
      if (missing.length > 0) {
        throw new Error(`Insumos insuficientes — ${missing.join(' · ')}`);
      }

      // Auto-heal: persist the fresh supply ids in the recipe so this doesn't repeat
      if (relinked.length > 0) {
        const fixedIngredients = ingredients.map(ing => {
          const fix = relinked.find(r => r.ing === ing);
          return fix ? { ...ing, supply_id: fix.supply.id, supply_name: fix.supply.name, unit: fix.supply.unit } : ing;
        });
        await base44.entities.Recipe.update(recipe.id, { ingredients: fixedIngredients });
      }

      // Deduct supplies (skip infinite ones) from the SELECTED location.
      for (const { ing, supply } of resolved) {
        if (!supply || supply.is_infinite) continue;
        const needed = (ing.quantity || 0) * multiplier;
        await base44.entities.Supply.update(
          supply.id,
          buildStockDelta(supply, sourceLocation, -needed)
        );
      }

      // Create tray — 1:1 con el peso real procesado
      await base44.entities.Tray.create({
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        remaining_grams: grams,
        initial_grams: grams,
        status: 'activa',
        production_date: moment().format('YYYY-MM-DD'),
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['recipes'] });
      setDialogOpen(false);
      setSkipInventoryDeduction(false);
      if (result?.skipped) {
        toast.success('Bandeja registrada como carga inicial (sin descuento de inventario).');
      } else {
        toast.success('Producción registrada. Insumos descontados.');
      }
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

  const activeTrays = trays.filter(t => t.status === 'activa');
  const exhaustedTrays = trays.filter(t => t.status === 'agotada');

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

      {/* Active trays */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Bandejas Activas ({activeTrays.length})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeTrays.map(t => {
            const pct = t.initial_grams ? (t.remaining_grams / t.initial_grams) * 100 : 0;
            return (
              <Card key={t.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.recipe_name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge className="bg-green-100 text-green-700">Activa</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTray(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTray.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restante</span>
                      <span className="font-mono font-semibold">{t.remaining_grams?.toFixed(0)}g / {t.initial_grams}g</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Peso Neto: {t.initial_grams}g</span>
                      <span>{t.production_date && moment(t.production_date).format('DD/MM/YY')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {activeTrays.length === 0 && (
            <Card className="col-span-full p-8 flex flex-col items-center text-center">
              <Factory className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">No hay bandejas activas</p>
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
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setSkipInventoryDeduction(false); }}>
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
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sabor" /></SelectTrigger>
                <SelectContent>{iceRecipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

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
              <div className="border border-border rounded-lg overflow-hidden">
                <div className={`px-3 py-2 flex items-center gap-2 text-sm font-medium ${
                  missingIngredients.length > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {missingIngredients.length > 0 ? (
                    <><AlertTriangle className="h-4 w-4" /> Faltan {missingIngredients.length} insumo(s)</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Inventario suficiente</>
                  )}
                </div>
                <div className="divide-y divide-border max-h-56 overflow-y-auto">
                  {ingredientCheck.map((ing, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className={`truncate ${ing.missing ? 'text-destructive font-medium' : ''}`}>
                          {ing.name}
                          {ing.notFound && <span className="text-xs ml-1">(no encontrado)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Requiere: {ing.needed.toFixed(1)}{ing.unit}
                          {!ing.isInfinite && !ing.notFound && (
                            <> · Disponible: {ing.available?.toFixed(1)}{ing.unit}</>
                          )}
                          {ing.isInfinite && <> · (ilimitado)</>}
                        </p>
                      </div>
                      {ing.missing ? (
                        <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 flex-shrink-0">
                          Falta {Math.max(0, ing.needed - ing.available).toFixed(1)}{ing.unit}
                        </Badge>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {ingredientCheck.length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-foreground">Esta receta no tiene ingredientes definidos.</p>
                  )}
                </div>
              </div>
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