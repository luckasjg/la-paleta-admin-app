import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEntity, createEntity, updateEntity, deleteEntity } from '@/api/repository';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Package, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import POSCategoryManager from '@/components/products/POSCategoryManager';
import LinkedSuppliesEditor from '@/components/products/LinkedSuppliesEditor';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

const DEFAULT_CATEGORIES = ['helado', 'cafe', 'merengada', 'adicional', 'otro'];
const HIDDEN_CATS_KEY = 'pos_hidden_categories';
const EXTRA_CATS_KEY = 'pos_extra_categories';

const emptyProduct = { name: '', category: '', size_label: '', grams_per_serving: 0, recipe_id: '', linked_supplies: [], price: 0, is_active: true, requires_flavor: false, max_flavors: 1 };

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [hiddenCats, setHiddenCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_CATS_KEY) || '[]'); } catch { return []; }
  });
  const [extraCats, setExtraCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EXTRA_CATS_KEY) || '[]'); } catch { return []; }
  });
  const qc = useQueryClient();

  const persistHiddenCats = (next) => {
    setHiddenCats(next);
    try { localStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const persistExtraCats = (next) => {
    setExtraCats(next);
    try { localStorage.setItem(EXTRA_CATS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => listEntity('Product'),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => listEntity('Recipe'),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => listEntity('Supply'),
  });

  // ── Migración automática (Regla 1): garantiza que todo producto tenga
  // linked_supplies como array. Si tiene utensil_supply_id legacy y el array
  // está vacío, lo convierte a una línea {supply_id, quantity:1} y limpia el
  // campo viejo. Se ejecuta UNA sola vez por carga, después de tener products
  // y supplies en memoria.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    if (!products.length || !supplies.length) return;
    migratedRef.current = true;

    const toFix = products.filter(p => {
      const hasArray = Array.isArray(p.linked_supplies);
      const hasLegacy = !!p.utensil_supply_id;
      return !hasArray || (hasArray && p.linked_supplies.length === 0 && hasLegacy);
    });
    if (toFix.length === 0) return;

    (async () => {
      for (const p of toFix) {
        let linked = Array.isArray(p.linked_supplies) ? p.linked_supplies : [];
        if (linked.length === 0 && p.utensil_supply_id) {
          const legacy = supplies.find(s => s.id === p.utensil_supply_id);
          if (legacy) {
            linked = [{
              supply_id: p.utensil_supply_id,
              quantity: 1,
              type: legacy.sector || 'utensilio',
            }];
          }
        }
        try {
          await updateEntity('Product', p.id, {
            linked_supplies: linked,
            utensil_supply_id: '',
          });
        } catch (e) {
          console.error('Migración producto fallida:', p.id, e);
        }
      }
      qc.invalidateQueries({ queryKey: ['products'] });
    })();
  }, [products, supplies, qc]);

  // Dynamic categories: defaults + every unique category that exists in DB (case-insensitive de-dup)
  // minus any the user has hidden from the manager.
  const dynamicCategories = useMemo(() => {
    const hiddenSet = new Set(hiddenCats.map(c => c.toLowerCase()));
    const seen = new Map(); // lowercased -> original casing
    DEFAULT_CATEGORIES.forEach(c => {
      if (!hiddenSet.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    });
    products.forEach(p => {
      const c = (p.category || '').trim();
      if (c && !hiddenSet.has(c.toLowerCase()) && !seen.has(c.toLowerCase())) {
        seen.set(c.toLowerCase(), c);
      }
    });
    extraCats.forEach(c => {
      if (!hiddenSet.has(c.toLowerCase()) && !seen.has(c.toLowerCase())) {
        seen.set(c.toLowerCase(), c);
      }
    });
    return Array.from(seen.values());
  }, [products, hiddenCats, extraCats]);

  const createMut = useMutation({
    mutationFn: (d) => createEntity('Product', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); close(); toast.success('Producto creado'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateEntity('Product', id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); close(); toast.success('Producto actualizado'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => deleteEntity('Product', id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Producto eliminado'); },
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptyProduct); };

  const openEdit = (p) => {
    setEditing(p);
    // Renderizado seguro (Regla 2): blindaje contra productos heredados.
    // Usamos ?? y validación de array para evitar que React colapse.
    let linked = Array.isArray(p?.linked_supplies) ? [...p.linked_supplies] : [];
    if (linked.length === 0 && p?.utensil_supply_id) {
      const legacySupply = supplies.find(s => s.id === p.utensil_supply_id);
      linked = [{
        supply_id: p.utensil_supply_id,
        quantity: 1,
        type: legacySupply?.sector || 'utensilio',
      }];
    }
    setForm({
      name: p?.name ?? '',
      category: p?.category ?? '',
      size_label: p?.size_label ?? '',
      grams_per_serving: p?.grams_per_serving ?? 0,
      recipe_id: p?.recipe_id ?? '',
      linked_supplies: linked,
      price: p?.price ?? 0,
      is_active: p?.is_active !== false,
      requires_flavor: p?.requires_flavor === true || p?.category === 'helado',
      max_flavors: p?.max_flavors ?? p?.flavor_count ?? 1,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || form.price === undefined || form.price === null) return;
    // Filtramos líneas incompletas y limpiamos el campo legacy para evitar duplicidad de descuento.
    const cleanedLinked = (form.linked_supplies ?? []).filter(l => l?.supply_id && (l?.quantity ?? 0) > 0);
    const payload = { ...form, linked_supplies: cleanedLinked, utensil_supply_id: '' };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  // Fail-safe grouping: every product in DB gets shown under its category (or "Sin categoría")
  const grouped = useMemo(() => {
    const groups = {};
    products.forEach(p => {
      const cat = (p.category || '').trim() || 'Sin categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, ps]) => ({
        cat,
        products: ps.sort((a, b) => {
          const oa = a.sort_order ?? 99;
          const ob = b.sort_order ?? 99;
          if (oa !== ob) return oa - ob;
          return (a.name || '').localeCompare(b.name || '');
        }),
      }));
  }, [products]);

  const updateSortOrder = (product, newOrder) => {
    const value = Math.max(0, parseInt(newOrder) || 0);
    if (value === (product.sort_order ?? 99)) return;
    updateMut.mutate({ id: product.id, data: { sort_order: value } });
  };

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
                  {(() => {
                    const linked = Array.isArray(p.linked_supplies) ? p.linked_supplies : [];
                    if (linked.length > 0) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1 truncate" title={linked.map(l => supplies.find(s => s.id === l.supply_id)?.name).filter(Boolean).join(', ')}>
                          📦 {linked.length} insumo{linked.length > 1 ? 's' : ''} vinculado{linked.length > 1 ? 's' : ''}
                        </p>
                      );
                    }
                    if (p.utensil_supply_id) {
                      return (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📦 {supplies.find(s => s.id === p.utensil_supply_id)?.name || 'Utensilio'} <span className="italic">(legacy)</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {!p.is_active && <Badge className="mt-2 bg-yellow-100 text-yellow-700">Inactivo</Badge>}

                  {/* Orden de visualización en POS */}
                  <div className="mt-3 pt-2 border-t flex items-center gap-1.5">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Orden</Label>
                    <Button
                      variant="outline" size="icon" className="h-6 w-6"
                      title="Subir prioridad"
                      onClick={() => updateSortOrder(p, (p.sort_order ?? 99) - 1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={p.sort_order ?? 99}
                      onChange={e => updateSortOrder(p, e.target.value)}
                      className="h-6 w-14 text-center text-xs px-1"
                    />
                    <Button
                      variant="outline" size="icon" className="h-6 w-6"
                      title="Bajar prioridad"
                      onClick={() => updateSortOrder(p, (p.sort_order ?? 99) + 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
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
        categories={dynamicCategories}
        products={products}
        hiddenCats={hiddenCats}
        onHideCategory={(cat) => {
          persistHiddenCats([...new Set([...hiddenCats, cat])]);
          // also remove from user-added extras if present
          persistExtraCats(extraCats.filter(c => c.toLowerCase() !== cat.toLowerCase()));
        }}
        onAddCategory={(cat) => {
          // un-hide if it was hidden, and add to extras for persistence
          persistHiddenCats(hiddenCats.filter(c => c.toLowerCase() !== cat.toLowerCase()));
          if (!extraCats.some(c => c.toLowerCase() === cat.toLowerCase())) {
            persistExtraCats([...extraCats, cat]);
          }
        }}
        onProductsRefresh={() => qc.invalidateQueries({ queryKey: ['products'] })}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[90vw] sm:max-w-2xl overflow-x-hidden flex flex-col max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
            <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 px-6 overflow-y-auto overflow-x-hidden flex-1 min-w-0">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
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

            {/* Insumos vinculados (múltiples) — contenedor con scroll vertical propio */}
            <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden pr-2 -mr-2">
              <LinkedSuppliesEditor
                value={form.linked_supplies ?? []}
                onChange={(next) => setForm({ ...form, linked_supplies: next })}
                supplies={supplies}
              />
            </div>

            {(form.category === 'cafe' || form.category === 'merengada') && (
              <div>
                <Label>Receta Asociada</Label>
                <SearchableCombobox
                  value={form.recipe_id}
                  onChange={v => setForm({ ...form, recipe_id: v })}
                  options={recipes
                    .filter(r => r.type === form.category)
                    .map(r => ({ value: r.id, label: r.name }))}
                  placeholder="Seleccionar receta"
                  searchPlaceholder="Buscar receta..."
                  emptyText="Sin recetas"
                />
              </div>
            )}

            {/* Requiere selección de sabor */}
            <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.requires_flavor}
                  onCheckedChange={v => setForm({ ...form, requires_flavor: v, max_flavors: v ? Math.max(1, form.max_flavors || 1) : 1 })}
                />
                <Label>Requiere selección de sabor</Label>
              </div>
              {form.requires_flavor && (
                <div>
                  <Label className="text-xs">Cantidad máxima de sabores permitidos</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={form.max_flavors}
                    onChange={e => setForm({ ...form, max_flavors: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Los <span className="font-mono">{form.grams_per_serving || 0}g</span> se dividen equitativamente entre los sabores elegidos.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Activo en POS</Label>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 flex-shrink-0">
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}