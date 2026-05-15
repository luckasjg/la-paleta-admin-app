import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Package, Settings } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import POSCategoryManager from '@/components/products/POSCategoryManager';

const DEFAULT_CATEGORIES = ['helado', 'cafe', 'merengada', 'adicional', 'otro'];

const emptyProduct = { name: '', category: '', size_label: '', grams_per_serving: 0, recipe_id: '', utensil_supply_id: '', price: 0, is_active: true };

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const utensilios = supplies.filter(s => s.sector === 'utensilio');

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Product.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); close(); toast.success('Producto creado'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); close(); toast.success('Producto actualizado'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Producto eliminado'); },
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptyProduct); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category, size_label: p.size_label || '',
      grams_per_serving: p.grams_per_serving || 0, recipe_id: p.recipe_id || '',
      utensil_supply_id: p.utensil_supply_id || '',
      price: p.price, is_active: p.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  // Build grouped from ALL products that exist — categories list only controls order
  const grouped = (() => {
    console.log('Productos cargados:', products);
    const groups = {};
    products.forEach(p => {
      const cat = p.category || '(sin categoría)';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    // Sort: known categories first (in order), then the rest alphabetically
    const knownSet = new Set(categories);
    const knownGroups = categories.filter(c => groups[c]).map(c => ({ cat: c, products: groups[c] }));
    const unknownGroups = Object.keys(groups)
      .filter(c => !knownSet.has(c))
      .sort()
      .map(c => ({ cat: c, products: groups[c] }));
    return [...knownGroups, ...unknownGroups];
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Catálogo del punto de venta"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatManagerOpen(true)}>
              <Settings className="h-4 w-4 mr-2" /> Categorías
            </Button>
            <Button onClick={() => { setForm(emptyProduct); setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
            </Button>
          </div>
        }
      />

      {grouped.map(({ cat, products: ps }) => (
        <div key={cat}>
          <h2 className="text-lg font-semibold mb-3 capitalize">{cat}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ps.map(p => (
              <Card key={p.id} className="group hover:shadow-md transition-all overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      {p.size_label && <p className="text-xs text-muted-foreground">{p.size_label}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMut.mutate(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">${p.price?.toFixed(2)}</span>
                    {p.grams_per_serving > 0 && (
                      <Badge variant="secondary" className="text-xs">{p.grams_per_serving}g</Badge>
                    )}
                  </div>
                  {p.utensil_supply_id && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      📦 {supplies.find(s => s.id === p.utensil_supply_id)?.name || 'Utensilio'}
                    </p>
                  )}
                  {!p.is_active && <Badge className="mt-2 bg-yellow-100 text-yellow-700">Inactivo</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <Card className="p-12 flex flex-col items-center text-center">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No hay productos creados aún</p>
        </Card>
      )}

      <POSCategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        categories={categories}
        setCategories={setCategories}
        products={products}
        onProductsRefresh={() => qc.invalidateQueries({ queryKey: ['products'] })}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Gestiona categorías con el botón "Categorías".</p>
              </div>
              <div><Label>Tamaño</Label><Input value={form.size_label} onChange={e => setForm({ ...form, size_label: e.target.value })} placeholder="Ej: Pequeña, Grande" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Precio ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Gramos/Porción</Label><Input type="number" value={form.grams_per_serving} onChange={e => setForm({ ...form, grams_per_serving: parseFloat(e.target.value) || 0 })} /></div>
            </div>

            {/* Envase / Utensilio vinculado */}
            <div>
              <Label>Envase / Utensilio Vinculado <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Select value={form.utensil_supply_id || '__none__'} onValueChange={v => setForm({ ...form, utensil_supply_id: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguno</SelectItem>
                  {utensilios.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (stock: {s.stock_current} {s.unit})</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Se descuenta 1 unidad por cada venta de este producto.</p>
            </div>

            {(form.category === 'cafe' || form.category === 'merengada') && (
              <div>
                <Label>Receta Asociada</Label>
                <Select value={form.recipe_id} onValueChange={v => setForm({ ...form, recipe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar receta" /></SelectTrigger>
                  <SelectContent>{recipes.filter(r => r.type === form.category).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Activo en POS</Label>
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