import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, AlertTriangle, Search, Tag, X, Infinity } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

const SECTORS = [
  { value: 'materia_prima', label: 'Materia Prima', description: 'Ingredientes para producción de helados' },
  { value: 'venta_directa', label: 'Venta Directa', description: 'Productos listos para vender (brownies, bebidas, etc.)' },
  { value: 'utensilio', label: 'Utensilios', description: 'Vasos, cucharas, barquillas, tinitas, etc.' },
];

// Default categories per sector (suggestions only)
const DEFAULT_CATEGORIES = {
  materia_prima: ['Lácteo', 'Fruta', 'Café', 'Endulzante', 'Adicional', 'Empaque', 'Otro'],
  venta_directa: ['Bebida', 'Snack', 'Postre', 'Otro'],
  utensilio: ['Vaso', 'Cubierto', 'Empaque', 'Limpieza', 'Otro'],
};

const emptySupply = { name: '', sector: 'materia_prima', category: '', unit: 'g', stock_current: 0, stock_minimum: 0, cost_per_unit: 0, supplier: '', is_infinite: false };
const emptyCalc = { purchase_price: '', yield_amount: '' };

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupply);
  const [calc, setCalc] = useState(emptyCalc);
  const [search, setSearch] = useState('');
  const [activeSector, setActiveSector] = useState('materia_prima');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const qc = useQueryClient();

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Supply.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplies'] }); close(); toast.success('Insumo creado'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supply.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplies'] }); close(); toast.success('Insumo actualizado'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Supply.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplies'] }); toast.success('Insumo eliminado'); },
  });

  const close = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptySupply);
    setCalc(emptyCalc);
    setCustomCategoryInput('');
    setShowCustomInput(false);
  };

  const openNew = () => {
    setForm({ ...emptySupply, sector: activeSector });
    setEditing(null);
    setCalc(emptyCalc);
    setCustomCategoryInput('');
    setShowCustomInput(false);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name, sector: s.sector || 'materia_prima', category: s.category || '',
      unit: s.unit, stock_current: s.stock_current, stock_minimum: s.stock_minimum,
      cost_per_unit: s.cost_per_unit, supplier: s.supplier || '', is_infinite: s.is_infinite || false
    });
    setCalc(emptyCalc);
    setCustomCategoryInput('');
    setShowCustomInput(false);
    setDialogOpen(true);
  };

  const handleCalcChange = (field, value) => {
    const updated = { ...calc, [field]: value };
    setCalc(updated);
    const price = parseFloat(updated.purchase_price);
    const qty = parseFloat(updated.yield_amount);
    if (price > 0 && qty > 0) {
      setForm(f => ({ ...f, cost_per_unit: parseFloat((price / qty).toFixed(6)) }));
    }
  };

  const handleSave = () => {
    if (!form.name) return;
    const { name, sector, category, unit, stock_current, stock_minimum, cost_per_unit, supplier, is_infinite } = form;
    const payload = { name, sector, category, unit, stock_current, stock_minimum, cost_per_unit, supplier, is_infinite };
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  // Dynamic categories: merge defaults + any used in DB for current sector (deduped, case-insensitive)
  const categoriesForSector = useMemo(() => {
    const defaults = DEFAULT_CATEGORIES[form.sector] || ['Otro'];
    const fromDB = supplies
      .filter(s => (s.sector || 'materia_prima') === form.sector && s.category)
      .map(s => s.category.trim());
    const all = [...defaults, ...fromDB];
    const seen = new Set();
    return all.filter(c => {
      const key = c.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [form.sector, supplies]);

  const filtered = useMemo(() =>
    supplies.filter(s =>
      (s.sector || 'materia_prima') === activeSector &&
      (s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase()))
    ), [supplies, activeSector, search]);

  // Group by category within sector
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(s => {
      const cat = s.category || 'Sin categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [filtered]);

  const sectorCounts = useMemo(() => {
    const counts = {};
    SECTORS.forEach(sec => {
      counts[sec.value] = supplies.filter(s => (s.sector || 'materia_prima') === sec.value).length;
    });
    return counts;
  }, [supplies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Gestión de insumos, productos de venta directa y utensilios"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Agregar Item
          </Button>
        }
      />

      <Tabs value={activeSector} onValueChange={setActiveSector}>
        <TabsList className="w-full sm:w-auto">
          {SECTORS.map(sec => (
            <TabsTrigger key={sec.value} value={sec.value} className="flex items-center gap-1.5">
              {sec.label}
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{sectorCounts[sec.value] || 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTORS.map(sec => (
          <TabsContent key={sec.value} value={sec.value} className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">{sec.description}</p>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4">Cargando...</p>
            ) : Object.keys(grouped).length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground text-sm">
                No hay items en este sector aún.{' '}
                <button className="text-primary underline" onClick={openNew}>Agregar uno</button>
              </Card>
            ) : (
              Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <Card className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Mínimo</TableHead>
                          <TableHead className="text-right">Costo/Ud</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(s => {
                          const isLow = s.stock_minimum && s.stock_current <= s.stock_minimum;
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {isLow && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                                  {s.name}
                                  {s.is_infinite && <Infinity className="h-3.5 w-3.5 text-primary" title="Stock infinito" />}
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-mono ${isLow ? 'text-destructive font-bold' : ''}`}>
                                {s.stock_current} {s.unit}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">{s.stock_minimum} {s.unit}</TableCell>
                              <TableCell className="text-right font-mono">${s.cost_per_unit?.toFixed(4)}</TableCell>
                              <TableCell className="text-muted-foreground">{s.supplier || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Item' : 'Nuevo Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>

            {/* Sector */}
            <div>
              <Label>Sector</Label>
              <Select value={form.sector} onValueChange={v => setForm({ ...form, sector: v, category: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category: select from list or add custom */}
            <div>
              <Label>Categoría</Label>
              {showCustomInput ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Nueva categoría..."
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customCategoryInput.trim();
                          if (val) {
                            setForm(f => ({ ...f, category: val }));
                            setShowCustomInput(false);
                            setCustomCategoryInput('');
                            toast.success(`Categoría "${val}" añadida`);
                          }
                        }
                        if (e.key === 'Escape') setShowCustomInput(false);
                      }}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const val = customCategoryInput.trim();
                        if (val) {
                          setForm(f => ({ ...f, category: val }));
                          setShowCustomInput(false);
                          setCustomCategoryInput('');
                          toast.success(`Categoría "${val}" añadida`);
                        }
                      }}
                    >
                      Confirmar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setShowCustomInput(false); setCustomCategoryInput(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Presiona Enter o "Confirmar" para añadir la categoría.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {categoriesForSector.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => { setCustomCategoryInput(''); setShowCustomInput(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
                    </Button>
                  </div>
                  {form.category && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">Seleccionada:</span>
                      <Badge variant="secondary" className="text-xs">{form.category}</Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unidad</Label>
                <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramos (g)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    <SelectItem value="unidad">Unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Proveedor</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Stock Actual</Label><Input type="number" value={form.stock_current} onChange={e => setForm({ ...form, stock_current: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Stock Mínimo</Label><Input type="number" value={form.stock_minimum} onChange={e => setForm({ ...form, stock_minimum: parseFloat(e.target.value) || 0 })} /></div>
            </div>

            <div>
              <Label>Costo por Unidad ($)</Label>
              <Input type="number" step="0.0001" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })} />
            </div>

            {/* Stock infinito (solo materia prima) */}
            {form.sector === 'materia_prima' && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Infinity className="h-4 w-4 text-primary" /> Abastecimiento propio (stock infinito)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">No descuenta del inventario al producir (ej. agua)</p>
                </div>
                <Switch checked={form.is_infinite} onCheckedChange={v => setForm(f => ({ ...f, is_infinite: v }))} />
              </div>
            )}

            {/* Calculadora de Costos */}
            {(() => {
              const isVentaDirecta = form.sector === 'venta_directa';
              const isUtensilio = form.sector === 'utensilio';
              const labelPrecio = isVentaDirecta || isUtensilio ? 'Precio del lote/caja ($)' : 'Precio del empaque ($)';
              const labelCantidad = isVentaDirecta || isUtensilio
                ? '¿Cuántas unidades trae?'
                : `¿Cuántos ${form.unit} trae?`;
              const placeholderCantidad = isVentaDirecta ? 'ej. 24 (caja de 24)' : isUtensilio ? 'ej. 85 (caja de barquillas)' : 'ej. 25000';
              const nota = isVentaDirecta || isUtensilio
                ? 'Divide el costo del lote entre las unidades para obtener el costo por pieza.'
                : 'Al completar ambos campos, el costo por unidad se calcula automáticamente.';
              return (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">🧮 Calculadora de Costos <span className="font-normal text-muted-foreground">(Opcional)</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{labelPrecio}</Label>
                      <Input type="number" step="0.01" placeholder="ej. 180" value={calc.purchase_price} onChange={e => handleCalcChange('purchase_price', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">{labelCantidad}</Label>
                      <Input type="number" step="1" placeholder={placeholderCantidad} value={calc.yield_amount} onChange={e => handleCalcChange('yield_amount', e.target.value)} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{nota} Solo visual, no se guarda en la base de datos.</p>
                </div>
              );
            })()}
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