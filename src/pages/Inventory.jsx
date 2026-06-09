import React, { useState, useMemo, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, AlertTriangle, Search, Tag, Infinity, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import CategoryManager from '@/components/inventory/CategoryManager';
import PurchaseFormatPanel, { getPackageUnit } from '@/components/inventory/PurchaseFormatPanel';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { getStockAt, getStockTotal } from '@/lib/stockHelpers';
import { Warehouse as WarehouseIcon, FlaskConical } from 'lucide-react';

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

const CATEGORIES_STORAGE_KEY = 'inventory_categories';

const loadCategoriesFromStorage = () => {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    // Merge with defaults to ensure all sector keys exist
    return {
      materia_prima: Array.isArray(parsed.materia_prima) ? parsed.materia_prima : DEFAULT_CATEGORIES.materia_prima,
      venta_directa: Array.isArray(parsed.venta_directa) ? parsed.venta_directa : DEFAULT_CATEGORIES.venta_directa,
      utensilio: Array.isArray(parsed.utensilio) ? parsed.utensilio : DEFAULT_CATEGORIES.utensilio,
    };
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

const emptySupply = { name: '', sector: 'materia_prima', category: '', unit: 'g', stock_warehouse: 0, stock_production: 0, stock_minimum: 0, cost_per_unit: 0, supplier: '', is_infinite: false };
const emptyCalc = { purchase_price: '', yield_amount: '' };
const emptyPurchase = { presentation: '', purchase_price: '', net_content: '', package_unit: 'kg' };

// Stock inputs en la unidad "amigable" (kg, l o unidad) — separados del form
// que guarda en la unidad base (g, ml, unidad). El multiplicador se determina
// según la unidad base del insumo: g → ×1000, ml → ×1000, unidad → ×1.
const emptyStockInput = { stock_warehouse_input: '', stock_production_input: '', stock_minimum_input: '' };

// Devuelve { label, multiplier } para mostrar etiquetas y convertir a unidad base.
// g  → entrada en kg (×1000) ; ml → entrada en l (×1000) ; unidad → ×1.
const getInputUnitInfo = (baseUnit) => {
  if (baseUnit === 'g') return { label: 'kg', multiplier: 1000, baseLabel: 'g' };
  if (baseUnit === 'ml') return { label: 'l', multiplier: 1000, baseLabel: 'ml' };
  return { label: 'unidades', multiplier: 1, baseLabel: 'unidad' };
};

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupply);
  const [calc, setCalc] = useState(emptyCalc);
  const [purchase, setPurchase] = useState(emptyPurchase);
  const [stockInput, setStockInput] = useState(emptyStockInput);
  const [search, setSearch] = useState('');
  const [activeSector, setActiveSector] = useState('materia_prima');
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState(loadCategoriesFromStorage);
  const qc = useQueryClient();

  // Persist customCategories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(customCategories));
    } catch (e) {
      console.warn('No se pudo guardar categorías en localStorage:', e);
    }
  }, [customCategories]);

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
    setPurchase(emptyPurchase);
    setStockInput(emptyStockInput);
  };

  const openNew = () => {
    setForm({ ...emptySupply, sector: activeSector });
    setEditing(null);
    setCalc(emptyCalc);
    setPurchase(emptyPurchase);
    setStockInput(emptyStockInput);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    // Migración silenciosa al editar: si stock_warehouse y stock_production no existen
    // todavía, asumimos que TODO el stock_current vigente está en el Almacén.
    const wh = Number.isFinite(s.stock_warehouse) ? s.stock_warehouse : (s.stock_current || 0);
    const pr = Number.isFinite(s.stock_production) ? s.stock_production : 0;
    setForm({
      name: s.name, sector: s.sector || 'materia_prima', category: s.category || '',
      unit: s.unit, stock_warehouse: wh, stock_production: pr, stock_minimum: s.stock_minimum,
      cost_per_unit: s.cost_per_unit, supplier: s.supplier || '', is_infinite: s.is_infinite || false
    });
    setCalc(emptyCalc);

    // ── Restaurar Formato de Compra desde package_format guardado ──────────
    // Hacemos lectura blindada: cualquier valor no-cero/no-vacío se preserva
    // como string para que el <Input type=number> lo muestre tal cual.
    const pf = s.package_format || {};
    const defaultPkgUnit = pf.package_unit || (s.unit === 'g' ? 'kg' : s.unit === 'ml' ? 'l' : 'unidad');
    const toStr = (v) => (v === null || v === undefined || v === '' ? '' : String(v));
    const restoredPurchase = {
      presentation: pf.presentation || '',
      purchase_price: toStr(pf.purchase_price),
      net_content: toStr(pf.net_content),
      package_unit: defaultPkgUnit,
    };
    setPurchase(restoredPurchase);

    // ── Convertir stock guardado (unidad base) → unidad de entrada amigable ──
    // g/ml ÷ 1000 → kg/l ; unidad ÷ 1 → unidad.
    const { multiplier } = getInputUnitInfo(s.unit);
    const toInput = (baseValue) => {
      const n = Number(baseValue) || 0;
      if (multiplier === 1) return n === 0 ? '' : String(n);
      const converted = +(n / multiplier).toFixed(6);
      return converted === 0 ? '' : String(converted);
    };

    // Misma conversión amigable para todos los sectores (en venta_directa y utensilio
    // la unidad base es la que escogió el usuario en form.unit).
    setStockInput({
      stock_warehouse_input: toInput(wh),
      stock_production_input: toInput(pr),
      stock_minimum_input: toInput(s.stock_minimum || 0),
    });
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
    const { name, sector, category, unit, stock_warehouse, stock_production, stock_minimum, cost_per_unit, supplier, is_infinite } = form;

    let finalUnit = unit;
    let finalStockWarehouse = stock_warehouse || 0;
    let finalStockProduction = stock_production || 0;
    let finalStockMinimum = stock_minimum;
    let packageFormatPayload = undefined;

    // ── Conversión amigable de stocks a unidad base ────────────────────────
    // Materia prima: la unidad base viene del Formato de Compra.
    // Venta directa / Utensilios: la unidad base es la que el usuario eligió en form.unit.
    if (sector === 'materia_prima') {
      const pkgU = getPackageUnit(purchase.package_unit);
      finalUnit = pkgU.baseUnit;
    }
    const { multiplier } = getInputUnitInfo(finalUnit);
    const parseInput = (raw, fallback) => {
      if (raw === '' || raw === null || raw === undefined) return fallback;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n * multiplier : fallback;
    };
    finalStockWarehouse = parseInput(stockInput.stock_warehouse_input, editing?.stock_warehouse ?? 0);
    finalStockProduction = parseInput(stockInput.stock_production_input, editing?.stock_production ?? 0);
    finalStockMinimum = parseInput(stockInput.stock_minimum_input, editing?.stock_minimum ?? 0);

    // Persistencia del Formato de Compra para TODOS los sectores.
    {
      const pkgU = getPackageUnit(purchase.package_unit);
      const presentation = (purchase.presentation || '').trim();
      const net = parseFloat(purchase.net_content);
      const unitLabel = pkgU.label.replace(/\s*\(.*\)/, '');
      packageFormatPayload = {
        presentation,
        net_content: Number.isFinite(net) ? net : 0,
        package_unit: purchase.package_unit,
        purchase_price: parseFloat(purchase.purchase_price) || 0,
        label: presentation && Number.isFinite(net) && net > 0 ? `${presentation} de ${net} ${unitLabel}` : '',
      };
    }

    const payload = {
      name, sector, category, unit: finalUnit,
      stock_warehouse: finalStockWarehouse,
      stock_production: finalStockProduction,
      stock_current: finalStockWarehouse + finalStockProduction, // espejo
      stock_minimum: finalStockMinimum,
      cost_per_unit, supplier, is_infinite,
      ...(packageFormatPayload ? { package_format: packageFormatPayload } : {}),
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  // Combined active categories per sector: defaults + custom + categories already in use in DB
  const activeCategories = useMemo(() => {
    const result = {};
    SECTORS.forEach(sec => {
      const seen = new Map(); // lowercase -> original label
      const addAll = (list) => {
        (list || []).forEach(c => {
          if (!c) return;
          const key = String(c).trim().toLowerCase();
          if (!key) return;
          if (!seen.has(key)) seen.set(key, String(c).trim());
        });
      };
      addAll(DEFAULT_CATEGORIES[sec.value]);
      addAll(customCategories[sec.value]);
      addAll(
        supplies
          .filter(s => (s.sector || 'materia_prima') === sec.value)
          .map(s => s.category)
      );
      result[sec.value] = Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    });
    return result;
  }, [customCategories, supplies]);

  const categoriesForSector = activeCategories[form.sector] || [];

  // Proveedores únicos detectados en el inventario (ordenados A-Z) para autocompletar.
  const supplierOptions = useMemo(() => {
    const set = new Set();
    supplies.forEach(s => {
      const v = (s.supplier || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(s => ({ value: s, label: s }));
  }, [supplies]);

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
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="w-full sm:w-auto">
            {SECTORS.map(sec => (
              <TabsTrigger key={sec.value} value={sec.value} className="flex items-center gap-1.5">
                {sec.label}
                <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{sectorCounts[sec.value] || 0}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => setCatManagerOpen(true)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Gestionar Categorías
          </Button>
        </div>

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
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><WarehouseIcon className="h-3 w-3" /> Almacén</span>
                          </TableHead>
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Producción</span>
                          </TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Mínimo</TableHead>
                          <TableHead className="text-right">Costo/Ud</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(s => {
                          const wh = getStockAt(s, 'warehouse');
                          const pr = getStockAt(s, 'production');
                          const total = getStockTotal(s);
                          const minimum = s.stock_minimum || 0;
                          const whLow = minimum > 0 && wh <= minimum;
                          const prLow = minimum > 0 && pr <= minimum;
                          const anyLow = whLow || prLow;
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {anyLow && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                                  {s.name}
                                  {s.is_infinite && <Infinity className="h-3.5 w-3.5 text-primary" title="Stock infinito" />}
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-mono ${whLow ? 'text-destructive font-bold' : ''}`}>
                                {wh} {s.unit}
                              </TableCell>
                              <TableCell className={`text-right font-mono ${prLow ? 'text-destructive font-bold' : ''}`}>
                                {pr} {s.unit}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {total} {s.unit}
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

      {/* Category Manager */}
      <CategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        customCategories={customCategories}
        setCustomCategories={setCustomCategories}
        activeCategories={activeCategories}
        supplies={supplies}
        onSuppliesRefresh={() => qc.invalidateQueries({ queryKey: ['supplies'] })}
      />

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

            {/* Category: strict select from managed list (con búsqueda) */}
            <div>
              <Label>Categoría</Label>
              <SearchableCombobox
                value={form.category}
                onChange={v => setForm({ ...form, category: v })}
                options={categoriesForSector.map(c => ({ value: c, label: c }))}
                placeholder="Seleccionar categoría..."
                searchPlaceholder="Buscar categoría..."
                emptyText="Sin categorías"
              />
              <p className="text-xs text-muted-foreground mt-1">Para agregar categorías usa "Gestionar Categorías".</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.sector !== 'materia_prima' ? (
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
              ) : (
                <div>
                  <Label>Unidad Base</Label>
                  <Input value={form.unit} disabled className="bg-muted/50 font-mono" />
                  <p className="text-[10px] text-muted-foreground mt-1">Se deriva del formato de compra</p>
                </div>
              )}
              <div>
                <Label>Proveedor</Label>
                {supplierOptions.length > 0 ? (
                  <div className="space-y-1">
                    <SearchableCombobox
                      value={form.supplier}
                      onChange={v => setForm({ ...form, supplier: v })}
                      options={supplierOptions}
                      placeholder="Elegir o escribir abajo..."
                      searchPlaceholder="Buscar proveedor..."
                      emptyText="Sin coincidencias"
                    />
                    <Input
                      value={form.supplier}
                      onChange={e => setForm({ ...form, supplier: e.target.value })}
                      placeholder="O escribir uno nuevo"
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <Input
                    value={form.supplier}
                    onChange={e => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                )}
              </div>
            </div>

            {form.sector === 'materia_prima' ? (() => {
              // La unidad base se deriva del Formato de Compra (kg→g, l→ml, unidad→unidad).
              const pkgU = getPackageUnit(purchase.package_unit);
              const { label: inputLabel, multiplier, baseLabel } = getInputUnitInfo(pkgU.baseUnit);
              const labelSuffix = multiplier === 1 ? '(en unidades)' : `(en ${inputLabel})`;
              const showHint = multiplier > 1; // sólo tiene sentido el "= X g" cuando convertimos
              const toBase = (raw) => {
                const n = parseFloat(raw);
                return Number.isFinite(n) ? n * multiplier : 0;
              };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <WarehouseIcon className="h-3.5 w-3.5" /> Almacén {labelSuffix}
                      </Label>
                      <Input
                        type="number" step="0.001" min="0" placeholder={multiplier > 1 ? 'ej. 1.65' : 'ej. 24'}
                        value={stockInput.stock_warehouse_input}
                        onChange={e => setStockInput(s => ({ ...s, stock_warehouse_input: e.target.value }))}
                      />
                      {showHint && stockInput.stock_warehouse_input !== '' && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          = {toBase(stockInput.stock_warehouse_input)} {baseLabel}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5" /> Producción {labelSuffix}
                      </Label>
                      <Input
                        type="number" step="0.001" min="0" placeholder={multiplier > 1 ? 'ej. 0.5' : 'ej. 6'}
                        value={stockInput.stock_production_input}
                        onChange={e => setStockInput(s => ({ ...s, stock_production_input: e.target.value }))}
                      />
                      {showHint && stockInput.stock_production_input !== '' && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          = {toBase(stockInput.stock_production_input)} {baseLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Stock Mínimo Alerta {labelSuffix}</Label>
                    <Input
                      type="number" step="0.001" min="0" placeholder={multiplier > 1 ? 'ej. 0.5' : 'ej. 2'}
                      value={stockInput.stock_minimum_input}
                      onChange={e => setStockInput(s => ({ ...s, stock_minimum_input: e.target.value }))}
                    />
                    {showHint && stockInput.stock_minimum_input !== '' && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        = {toBase(stockInput.stock_minimum_input)} {baseLabel} (se compara con ambas columnas independientemente)
                      </p>
                    )}
                  </div>
                </div>
              );
            })() : (() => {
              // Venta directa / Utensilios: la unidad base la elige el usuario (g, ml o unidad).
              // Aplicamos la misma lógica amigable: g/ml → entrada en kg/l (×1000), unidad → ×1.
              const { label: inputLabel, multiplier, baseLabel } = getInputUnitInfo(form.unit);
              const labelSuffix = multiplier === 1 ? '(en unidades)' : `(en ${inputLabel})`;
              const showHint = multiplier > 1;
              const toBase = (raw) => {
                const n = parseFloat(raw);
                return Number.isFinite(n) ? n * multiplier : 0;
              };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <WarehouseIcon className="h-3.5 w-3.5" /> Almacén {labelSuffix}
                      </Label>
                      <Input
                        type="number" step="0.001" min="0"
                        placeholder={multiplier > 1 ? 'ej. 1.65' : 'ej. 24'}
                        value={stockInput.stock_warehouse_input}
                        onChange={e => setStockInput(s => ({ ...s, stock_warehouse_input: e.target.value }))}
                      />
                      {showHint && stockInput.stock_warehouse_input !== '' && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          = {toBase(stockInput.stock_warehouse_input)} {baseLabel}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5">
                        <FlaskConical className="h-3.5 w-3.5" /> Producción {labelSuffix}
                      </Label>
                      <Input
                        type="number" step="0.001" min="0"
                        placeholder={multiplier > 1 ? 'ej. 0.5' : 'ej. 6'}
                        value={stockInput.stock_production_input}
                        onChange={e => setStockInput(s => ({ ...s, stock_production_input: e.target.value }))}
                      />
                      {showHint && stockInput.stock_production_input !== '' && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          = {toBase(stockInput.stock_production_input)} {baseLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Stock Mínimo {labelSuffix}</Label>
                    <Input
                      type="number" step="0.001" min="0"
                      placeholder={multiplier > 1 ? 'ej. 0.5' : 'ej. 2'}
                      value={stockInput.stock_minimum_input}
                      onChange={e => setStockInput(s => ({ ...s, stock_minimum_input: e.target.value }))}
                    />
                    {showHint && stockInput.stock_minimum_input !== '' && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        = {toBase(stockInput.stock_minimum_input)} {baseLabel}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <Label>
                Costo por Unidad{form.sector === 'materia_prima' ? ' Base' : ''} ($)
                <span className="text-xs text-muted-foreground font-normal"> (automático)</span>
              </Label>
              <Input
                type="number" step="0.0001" value={form.cost_per_unit}
                onChange={e => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })}
                readOnly
                disabled
                className="bg-muted/50 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Se calcula desde el "Formato de Compra" abajo.</p>
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

            {/* Formato de Compra: aplica a todos los sectores. En venta directa /
                utensilios pasamos lockUnit para no sobrescribir la unidad elegida. */}
            <PurchaseFormatPanel
              purchase={purchase}
              setPurchase={setPurchase}
              form={form}
              setForm={setForm}
              lockUnit={form.sector !== 'materia_prima'}
            />

            {/* Costo por Unidad ya se calcula automáticamente desde el Formato de Compra
                para todos los sectores; la calculadora manual antigua se reemplazó por el panel. */}
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