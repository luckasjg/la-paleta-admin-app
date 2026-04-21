import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import RecipeCard from '@/components/recipes/RecipeCard';
import RecipeDialog from '@/components/recipes/RecipeDialog';

const emptyRecipe = {
  name: '', recipe_number: '', type: 'helado',
  yield_amount: 1920, yield_unit: 'ml',
  overrun: 35, service_temperature: -15,
  ingredients: [], sale_price: 0, is_active: true, notes: '',
};

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); closeDialog(); toast.success('Receta creada'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); closeDialog(); toast.success('Receta actualizada'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receta eliminada'); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyRecipe); };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name, recipe_number: r.recipe_number || '',
      type: r.type, yield_amount: r.yield_amount || 1920,
      yield_unit: r.yield_unit || 'ml',
      overrun: r.overrun ?? 35,
      service_temperature: r.service_temperature ?? -15,
      ingredients: (r.ingredients || []).map(ing => ({ ...ing })),
      sale_price: r.sale_price || 0,
      is_active: r.is_active !== false,
      notes: r.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const iceCreams = recipes.filter(r => r.type === 'helado');
  const others = recipes.filter(r => r.type !== 'helado');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetario Maestro"
        description="Fórmulas técnicas de helados, cafés y merengadas"
        actions={
          <Button onClick={() => { setForm(emptyRecipe); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Receta
          </Button>
        }
      />

      {iceCreams.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Helados</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {iceCreams.map(r => (
              <RecipeCard key={r.id} recipe={r} supplies={supplies}
                onEdit={() => openEdit(r)} onDelete={() => deleteMut.mutate(r.id)} />
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cafés y Otros</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map(r => (
              <RecipeCard key={r.id} recipe={r} supplies={supplies}
                onEdit={() => openEdit(r)} onDelete={() => deleteMut.mutate(r.id)} />
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No hay recetas creadas aún</p>
        </div>
      )}

      <RecipeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        editing={editing}
        supplies={supplies}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </div>
  );
}