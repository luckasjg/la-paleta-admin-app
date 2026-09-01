import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, BookOpen, Search, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import RecipeDetailCard from '@/components/recipes/RecipeDetailCard';
import { exportRecipesToCSV } from '@/lib/exportRecipesCSV';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import ImageUploadField from '@/components/shared/ImageUploadField';
import { useRole } from '@/lib/useRole';

const TYPES = [
  { value: 'helado', label: 'Helado' },
  { value: 'cafe', label: 'Café' },
  { value: 'merengada', label: 'Merengada' },
  { value: 'otro', label: 'Otro' },
];

const FLAVOR_TAGS = ['Regular', 'Premium', 'Sorbete'];

const emptyRecipe = {
  name: '', type: 'helado', yield_amount: 1000, yield_unit: 'ml',
  ingredients: [], sale_price: 0, is_active: true,
  flavor_tag: 'Regular', ref_surcharge_amount: 0, ref_surcharge_grams: 0,
  image_url: '',
};

const normalize = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function Recipes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRecipe);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const { isAdmin } = useRole();

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const filteredRecipes = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return recipes;
    return recipes.filter(r => {
      if (normalize(r.name).includes(q)) return true;
      return (r.ingredients || []).some(ing => normalize(ing.supply_name).includes(q));
    });
  }, [recipes, search]);

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

  const cloneMut = useMutation({
    mutationFn: (r) => {
      const { id, created_date, updated_date, created_by, ...rest } = r;
      return base44.entities.Recipe.create({
        ...rest,
        name: `${r.name} (copia)`,
        ingredients: (r.ingredients || []).map(({ supply_id, supply_name, quantity, unit }) => ({
          supply_id, supply_name, quantity, unit,
        })),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Receta duplicada'); },
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
      flavor_tag: r.flavor_tag || 'Regular',
      ref_surcharge_amount: r.ref_surcharge_amount || 0,
      ref_surcharge_grams: r.ref_surcharge_grams || 0,
      image_url: r.image_url || '',
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
    // Auto-calcular surcharge_per_gram a partir del recargo de referencia
    const tag = form.flavor_tag || 'Regular';
    const amt = parseFloat(form.ref_surcharge_amount) || 0;
    const grams = parseFloat(form.ref_surcharge_grams) || 0;
    const surchargePerGram = (tag !== 'Regular' && amt > 0 && grams > 0) ? (amt / grams) : 0;

    const payload = {
      ...form,
      ingredients: form.ingredients.map(({ percentage, ...rest }) => rest),
      flavor_tag: tag,
      ref_surcharge_amount: tag === 'Regular' ? 0 : amt,
      ref_surcharge_grams: tag === 'Regular' ? 0 : grams,
      surcharge_per_gram: surchargePerGram,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  // Cálculo en vivo para mostrar al usuario en el formulario
  const livePerGram = (() => {
    const amt = parseFloat(form.ref_surcharge_amount) || 0;
    const grams = parseFloat(form.ref_surcharge_grams) || 0;
    return (form.flavor_tag !== 'Regular' && amt > 0 && grams > 0) ? (amt / grams) : 0;
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetario Maestro"
        description="Recetas de helados, cafés y merengadas"
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (recipes.length === 0) {
                    toast.error('No hay recetas para exportar');
                    return;
                  }
                  exportRecipesToCSV(recipes, supplies);
                  toast.success('Exportación descargada');
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
              </Button>
              <Button onClick={() => { setForm(emptyRecipe); setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nueva Receta
              </Button>
            </div>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre de receta o ingrediente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
        {filteredRecipes.map(r => (
          <RecipeDetailCard
            key={r.id}
            recipe={r}
            supplies={supplies}
            onEdit={openEdit}
            onDelete={(id) => deleteMut.mutate(id)}
            onClone={(rec) => cloneMut.mutate(rec)}
          />
        ))}
        {recipes.length === 0 && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay recetas creadas aún</p>
          </Card>
        )}
        {recipes.length > 0 && filteredRecipes.length === 0 && (
          <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center">
            <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No se encontraron recetas que coincidan con la búsqueda</p>
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
            <ImageUploadField
              label="Imagen de la receta (opcional)"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              hint="Se mostrará en el menú digital de TV y el menú móvil."
            />
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

            {/* Clasificación de sabor y recargo proporcional */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label className="text-xs">Clasificación del sabor</Label>
                  <Select
                    value={form.flavor_tag || 'Regular'}
                    onValueChange={v => setForm({ ...form, flavor_tag: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FLAVOR_TAGS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Premium/Sorbete aplican un recargo proporcional automático en el POS según los gramos servidos.
                </p>
              </div>

              {form.flavor_tag && form.flavor_tag !== 'Regular' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Recargo Ref. ($)</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.ref_surcharge_amount || ''}
                        onChange={e => setForm({ ...form, ref_surcharge_amount: parseFloat(e.target.value) || 0 })}
                        placeholder="3.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Gramos Ref.</Label>
                      <Input
                        type="number" step="1" min="0"
                        value={form.ref_surcharge_grams || ''}
                        onChange={e => setForm({ ...form, ref_surcharge_grams: parseFloat(e.target.value) || 0 })}
                        placeholder="150"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] flex items-center justify-between bg-background border border-border rounded-md px-2.5 py-1.5">
                    <span className="text-muted-foreground">Recargo por gramo (auto)</span>
                    <span className="font-mono font-bold text-primary">
                      ${livePerGram.toFixed(4)}/g
                    </span>
                  </div>
                </>
              )}
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
                    <SearchableCombobox
                      value={ing.supply_id}
                      onChange={v => updateIngredient(idx, 'supply_id', v)}
                      options={supplies
                        .filter(s => s.sector === 'materia_prima')
                        .map(s => ({ value: s.id, label: s.name, sublabel: `(${s.unit})` }))}
                      placeholder="Insumo"
                      searchPlaceholder="Buscar insumo..."
                      emptyText="Sin insumos"
                    />
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