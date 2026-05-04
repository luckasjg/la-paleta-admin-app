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
    setForm({
      name: r.name, type: r.type, yield_amount: r.yield_amount || 1000,
      yield_unit: r.yield_unit || 'ml', ingredients: r.ingredients || [],
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
      newIngs[idx] = { ...newIngs[idx], [field]: value };
      if (field === 'supply_id') {
        const supply = supplies.find(s => s.id === value);
        if (supply) {
          newIngs[idx].supply_name = supply.name;
          newIngs[idx].unit = supply.unit;
        }
      }
      return { ...f, ingredients: newIngs };
    });
  };

  const removeIngredient = (idx) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
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
              <div><Label>Rendimiento</Label><Input type="number" value={form.yield_amount} onChange={e => setForm({ ...form, yield_amount: parseFloat(e.target.value) || 0 })} /></div>
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
              <div className="space-y-2">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={ing.supply_id} onValueChange={v => updateIngredient(idx, 'supply_id', v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Insumo" /></SelectTrigger>
                      <SelectContent>{supplies.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.unit})</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" className="w-24" placeholder="Cant." value={ing.quantity || ''} onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground w-8">{ing.unit}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeIngredient(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
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