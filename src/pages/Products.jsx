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
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

const CATS = [
  { value: 'helado', label: 'Helado' },
  { value: 'cafe', label: 'Café' },
  { value: 'merengada', label: 'Merengada' },
  { value: 'adicional', label: 'Adicional' },
  { value: 'otro', label: 'Otro' },
];

const emptyProduct = { name: '', category: 'helado', size_label: '', grams_per_serving: 0, recipe_id: '', price: 0, is_active: true };

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

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
    setForm({ name: p.name, category: p.category, size_label: p.size_label || '', grams_per_serving: p.grams_per_serving || 0, recipe_id: p.recipe_id || '', price: p.price, is_active: p.is_active !== false });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const grouped = CATS.map(cat => ({
    ...cat,
    products: products.filter(p => p.category === cat.value),
  })).filter(g => g.products.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Catálogo del punto de venta"
        actions={
          <Button onClick={() => { setForm(emptyProduct); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
          </Button>
        }
      />

      {grouped.map(group => (
        <div key={group.value}>
          <h2 className="text-lg font-semibold mb-3">{group.label}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.products.map(p => (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tamaño</Label><Input value={form.size_label} onChange={e => setForm({ ...form, size_label: e.target.value })} placeholder="Ej: Pequeña, Grande" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Precio ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Gramos/Porción</Label><Input type="number" value={form.grams_per_serving} onChange={e => setForm({ ...form, grams_per_serving: parseFloat(e.target.value) || 0 })} /></div>
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