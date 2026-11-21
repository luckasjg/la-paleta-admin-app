import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Factory, Pencil, Trash2, Package, AlertTriangle, CheckCircle2, Info, Store, Search, X, History, Merge } from 'lucide-react';
import { Link } from 'react-router-dom';
import MergeTraysDialog from '@/components/production/MergeTraysDialog';
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
import { buildIngredientPlan, SUBSTITUTION_REASON, toVariationRecord } from '@/lib/productionSubstitutes';
import { buildVariegatoPlan, computeBatchSummary } from '@/lib/batchProduction';
import BatchMultiplierInput from '@/components/production/BatchMultiplierInput';
import VariegatosPanel from '@/components/production/VariegatosPanel';
import BatchSummary from '@/components/production/BatchSummary';
import MasterBatchDialog from '@/components/production/MasterBatchDialog';
import IndependentBatchDialog from '@/components/production/independent/IndependentBatchDialog';
import StepLabel from '@/components/production/StepLabel';
import ProcessDiffBadge from '@/components/production/ProcessDiffBadge';
import { Layers } from 'lucide-react';
import SpentPackageDialog from '@/components/production/SpentPackageDialog';
import { deductWithLog, makeProductionRef } from '@/lib/deductionLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRole } from '@/lib/useRole';
import TraysCsvExport from '@/components/production/TraysCsvExport';
import SupplyConsumptionReport from '@/components/consumption/SupplyConsumptionReport';

export default function Production() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editTray, setEditTray] = useState(null); // tray being edited
  const [editForm, setEditForm] = useState({ recipe_id: '', recipe_name: '', remaining_grams: 0 });
  const [depositSearch, setDepositSearch] = useState('');
  const [consumableDialog, setConsumableDialog] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selectedUtensil, setSelectedUtensil] = useState('');
  const [masterOpen, setMasterOpen] = useState(false);
  const qc = useQueryClient();
  const { isAdmin } = useRole();

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: async () => {
      const [active, exhausted] = await Promise.all([
        base44.entities.Tray.filter({ status: 'activa' }, '-created_date', 1000),
        base44.entities.Tray.filter({ status: 'agotada' }, '-created_date', 50),
      ]);
      return [...active, ...exhausted];
    },
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
            {isAdmin && (
              <Button variant="outline" asChild>
                <Link to="/produccion/historial"><History className="h-4 w-4 mr-2" /> Historial</Link>
              </Button>
            )}
            {isAdmin && <TraysCsvExport />}
            <Button variant="outline" onClick={() => setMergeOpen(true)}>
              <Merge className="h-4 w-4 mr-2" /> Unir bandejas
            </Button>
            <Button variant="outline" onClick={() => setConsumableDialog(true)}>
              <Package className="h-4 w-4 mr-2" /> Registrar Paquete Gastado
            </Button>
            <Button variant="outline" onClick={() => setMasterOpen(true)}>
              <Layers className="h-4 w-4 mr-2" /> Lote de Base Maestra
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Producir Bandeja
            </Button>
          </div>
        }
      />

      <Tabs defaultValue={isAdmin && new URLSearchParams(window.location.search).get('tab') === 'consumo' ? 'consumo' : 'bandejas'}>
        {isAdmin && (
          <TabsList>
            <TabsTrigger value="bandejas">Bandejas</TabsTrigger>
            <TabsTrigger value="consumo">Consumo de Insumos</TabsTrigger>
          </TabsList>
        )}
        {isAdmin && (
          <TabsContent value="consumo" className="mt-4">
            <SupplyConsumptionReport supplies={supplies} />
          </TabsContent>
        )}
        <TabsContent value="bandejas" className="space-y-6 mt-4">

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

        </TabsContent>
      </Tabs>

      <MergeTraysDialog open={mergeOpen} onOpenChange={setMergeOpen} trays={trays} />
      <MasterBatchDialog open={masterOpen} onOpenChange={setMasterOpen} recipes={recipes} supplies={supplies} resolveSupply={resolveSupply} trays={trays} />

      {/* Edit Tray Dialog */}
      <Dialog open={!!editTray} onOpenChange={() => setEditTray(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Bandeja — {editTray?.recipe_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Sabor (Receta)</Label>
              <SearchableCombobox
                value={editForm.recipe_id}
                onChange={v => setEditForm(f => ({ ...f, recipe_id: v }))}
                options={iceRecipes.map(r => ({ value: r.id, label: r.name }))}
                placeholder="Seleccionar sabor"
                emptyText="Ningún sabor coincide"
              />
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

      <SpentPackageDialog open={consumableDialog} onOpenChange={setConsumableDialog} utensilios={utensilios} />

      <IndependentBatchDialog open={dialogOpen} onOpenChange={setDialogOpen} recipes={recipes} supplies={supplies} resolveSupply={resolveSupply} trays={trays} />
    </div>
  );
}