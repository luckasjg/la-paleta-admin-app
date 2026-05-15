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
import { Plus, Trash2, Pencil, BookOpen } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import RecipeDetailCard from '@/components/recipes/RecipeDetailCard';

const TYPES = [
  { value: 'helado', label: 'Helado' },
  { value: 'cafe', label: 'Café' },
  { value: 'merengada', label: 'Merengada' },
  { value: 'otro', label: 'Otro' },
];

const emptyRecipe = { name: '', type: 'helado', yield_amount: 1000, yield_unit: 'ml', ingredients: [], sale_price: 0, is_active: true };

export default function Recipes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRecipe);
  const qc = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Recipe.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); close(); toast.success('Receta creada'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); close(); toast.success('Receta actualizada'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receta eliminada'); },
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptyRecipe); };

  const openEdit = (r) => {
    setEditing(r);
    const mix = r.yield_amount || 1000;
    // Backfill percentage from stored absolute quantity so the bi-directional UI works on edit
    const ingsWithPct = (r.ingredients || []).map(ing => ({
      ...ing,
      percentage: mix > 0 ? parseFloat((((ing.quantity || 0) / mix) * 100).toFixed(4)) : 0,
    }));
    setForm({
      name: r.name, type: r.type, yield_amount: mix,
      yield_unit: r.yield_unit || 'ml', ingredients: ingsWithPct,
      sale_price: r.sale_price || 0, is_active: r.is_active !== false,
    });
    setDialogOpen(true);
  };

  const addIngredient = () => {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { supply_id: '', supply_name: '', quantity: 0, unit: 'g' }] }));
  };

  const updateIngredient = (idx, field, value) => {
    setForm(f => {
      const newIngs = [...f.ingredients];
      const mix = parseFloat(f.yield_amount) || 0;
      const current = { ...newIngs[idx] };

      if (field === 'supply_id') {
        current.supply_id = value;
        const supply = supplies.find(s => s.id === value);
        if (supply) {
          current.supply_name = supply.name;
          current.unit = supply.unit;
        }
      } else if (field === 'percentage') {
        // Logic A: editing % recalculates quantity from mix
        const pct = parseFloat(value) || 0;
        current.percentage = value === '' ? '' : pct;
        current.quantity = mix > 0 ? parseFloat(((pct / 100) * mix).toFixed(4)) : 0;
      } else if (field === 'quantity') {
        // Logic B: editing quantity recalculates %
        const qty = parseFloat(value) || 0;
        current.quantity = value === '' ? 0 : qty;
        current.percentage = mix > 0 ? parseFloat(((qty / mix) * 100).toFixed(4)) : 0;
      } else {
        current[field] = value;
      }

      newIngs[idx] = current;
      return { ...f, ingredients: newIngs };
    });
  };

  // Logic C: when the mix (yield_amount) changes, keep percentages fixed and rescale quantities
  const updateYieldAmount = (value) => {
    const newMix = parseFloat(value) || 0;
    setForm(f => {
      const rescaled = f.ingredients.map(ing => {
        const pct = parseFloat(ing.percentage);
        if (!isNaN(pct) && newMix > 0) {
          return { ...ing, quantity: parseFloat(((pct / 100) * newMix).toFixed(4)) };
        }
        return ing;
      });
      return { ...f, yield_amount: newMix, ingredients: rescaled };
    });
  };

  const removeIngredient = (idx) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };

  // Balance totalizer
  const totalPercentage = form.ingredients.reduce((sum, ing) => {
    const pct = parseFloat(ing.percentage);
    return sum + (isNaN(pct) ? 0 : pct);
  }, 0);
  const isBalanced = Math.abs(totalPercentage - 100) < 0.01;

  const handleSave = () => {
    if (!form.name) return;
    // Strip the auxiliary "percentage" field; persist only absolute quantities for costing
    const payload = {
      ...form,
      ingredients: form.ingredients.map(({ percentage, ...rest }) => rest),
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetario Maestro"
        description="Recetas de helados, cafés y merengadas"
        actions={
          <Button onClick={() => { setForm(emptyRecipe); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Receta
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.map(r => (
          <RecipeDetailCard
            key={r.id}
            recipe={r}
            supplies={supplies}
            onEdit={openEdit}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        ))}
        {recipes.length === 0 && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay recetas creadas aún</p>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Receta' : 'Nueva Receta'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Precio Venta ($)</Label><Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mix Deseado (g/ml)</Label>
                <Input type="number" value={form.yield_amount} onChange={e => updateYieldAmount(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Cambiar el mix recalcula las cantidades manteniendo los %.</p>
              </div>
              <div>
                <Label>Unidad</Label>
                <Select value={form.yield_unit} onValueChange={v => setForm({ ...form, yield_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">Mililitros</SelectItem>
                    <SelectItem value="unidad">Unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Ingredientes</Label>
                <Button variant="outline" size="sm" onClick={addIngredient}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
              </div>

              {form.ingredients.length > 0 && (
                <div className="grid grid-cols-[1fr,72px,90px,32px] gap-2 px-1 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  <span>Insumo</span>
                  <span className="text-right">%</span>
                  <span className="text-right">Cantidad</span>
                  <span></span>
                </div>
              )}

              <div className="space-y-2">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,72px,90px,32px] gap-2 items-center">
                    <Select value={ing.supply_id} onValueChange={v => updateIngredient(idx, 'supply_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Insumo" /></SelectTrigger>
                      <SelectContent>{supplies.filter(s => s.sector === 'materia_prima').map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.unit})</SelectItem>)}</SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="%"
                      value={ing.percentage ?? ''}
                      onChange={e => updateIngredient(idx, 'percentage', e.target.value)}
                      className="text-right"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={ing.quantity || ''}
                        onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                        className="text-right pr-7"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{ing.unit}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeIngredient(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              {/* Balance totalizer */}
              {form.ingredients.length > 0 && (
                <div className={`mt-3 rounded-lg border p-2.5 flex items-center justify-between text-sm ${
                  isBalanced
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}>
                  <span className="font-medium">
                    {isBalanced ? '✓ Receta balanceada' : '⚠ La receta no suma 100%'}
                  </span>
                  <span className="font-mono font-bold">{totalPercentage.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}