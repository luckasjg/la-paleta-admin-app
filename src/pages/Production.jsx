import React, { useState } from 'react';
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
import { Plus, Factory } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import moment from 'moment';

const GRAMS_PER_LITER = 550;

export default function Production() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipeId, setRecipeId] = useState('');
  const [liters, setLiters] = useState(5);
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

  const produce = useMutation({
    mutationFn: async () => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) throw new Error('Receta no encontrada');

      // Calculate ingredient amounts needed (recipe is per yield_amount, we need for 'liters' L)
      const multiplier = (liters * 1000) / (recipe.yield_amount || 1000);
      const ingredients = recipe.ingredients || [];

      // Check and deduct supplies
      for (const ing of ingredients) {
        const supply = supplies.find(s => s.id === ing.supply_id);
        if (!supply) continue;
        const needed = (ing.quantity || 0) * multiplier;
        if (supply.stock_current < needed) {
          throw new Error(`Insuficiente ${supply.name}: necesita ${needed.toFixed(0)}${supply.unit}, tiene ${supply.stock_current}${supply.unit}`);
        }
      }

      // Deduct supplies
      for (const ing of ingredients) {
        const supply = supplies.find(s => s.id === ing.supply_id);
        if (!supply) continue;
        const needed = (ing.quantity || 0) * multiplier;
        await base44.entities.Supply.update(supply.id, {
          stock_current: supply.stock_current - needed
        });
      }

      // Create tray
      const totalGrams = liters * GRAMS_PER_LITER;
      await base44.entities.Tray.create({
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        produced_liters: liters,
        remaining_grams: totalGrams,
        initial_grams: totalGrams,
        status: 'activa',
        production_date: moment().format('YYYY-MM-DD'),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      setDialogOpen(false);
      toast.success('Producción registrada. Insumos descontados.');
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const activeTrays = trays.filter(t => t.status === 'activa');
  const exhaustedTrays = trays.filter(t => t.status === 'agotada');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción"
        description="Registro de bandejas y control de producción"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Producir Bandeja
          </Button>
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
                    <Badge className="bg-green-100 text-green-700">Activa</Badge>
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
                      <span>{t.produced_liters}L producidos</span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Producir Bandeja de Helado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Sabor (Receta)</Label>
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar sabor" /></SelectTrigger>
                <SelectContent>{iceRecipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Litros a producir</Label>
              <Input type="number" value={liters} onChange={e => setLiters(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">≈ {(liters * GRAMS_PER_LITER).toFixed(0)}g de helado</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => produce.mutate()} disabled={!recipeId || produce.isPending}>
              {produce.isPending ? 'Produciendo...' : 'Producir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}