import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FlaskConical, Factory, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

const emptyPrep = {
  name: '',
  yield_amount: 1000,
  yield_unit: 'g',
  process_percentage: 30,
  ingredients: [],
  is_active: true,
};

export default function Preparations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPrep);
  const [produceDialog, setProduceDialog] = useState(null); // prep object to produce
  // Bypass de descuento de inventario para carga inicial / ajuste de saldo.
  // NOTA RBAC: hoy la ruta /preparados está protegida por RequireAdmin, así que
  // sólo admins ven este switch. Para bloquear ENCARGADO_PRODUCCION en el futuro,
  // envolver el bloque del Switch en una condición de rol.
  const [skipInventoryDeduction, setSkipInventoryDeduction] = useState(false);
  // Carga inicial al crear un preparado: suma el yield al stock del insumo vinculado
  // sin descontar materias primas (útil para sembrar inventario existente).
  const [loadInitialStock, setLoadInitialStock] = useState(false);
  const qc = useQueryClient();

  const { data: preparations = [] } = useQuery({
    queryKey: ['preparations'],
    queryFn: () => base44.entities.Preparation.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  // Raw materials only (exclude self-linked supplies to prevent circular reference)
  // Sorted alphabetically for selector UX.
  const rawMaterials = useMemo(() =>
    supplies
      .filter(s => s.sector === 'materia_prima' && s.category !== 'Preparado Propio')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })),
    [supplies]
  );

  // ===== Cost calculation =====
  const computeCosts = (formData) => {
    const subtotal = (formData.ingredients || []).reduce((sum, ing) => {
      const supply = supplies.find(s => s.id === ing.supply_id);
      const cost = supply?.cost_per_unit || 0;
      return sum + (cost * (ing.quantity || 0));
    }, 0);
    const processPct = parseFloat(formData.process_percentage) || 0;
    const totalCost = subtotal * (1 + processPct / 100);
    const yieldAmt = parseFloat(formData.yield_amount) || 0;
    const costPerUnit = yieldAmt > 0 ? totalCost / yieldAmt : 0;
    return { subtotal, totalCost, costPerUnit };
  };

  const costs = useMemo(() => computeCosts(form), [form, supplies]);

  // ===== Balance =====
  const totalPercentage = form.ingredients.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0);
  const isBalanced = Math.abs(totalPercentage - 100) < 0.01;

  // ===== Mutations =====
  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptyPrep); setLoadInitialStock(false); };

  const openNew = () => { setForm(emptyPrep); setEditing(null); setLoadInitialStock(false); setDialogOpen(true); };

  const openEdit = (p) => {
    setEditing(p);
    const mix = p.yield_amount || 1000;
    setForm({
      name: p.name,
      yield_amount: mix,
      yield_unit: p.yield_unit || 'g',
      process_percentage: p.process_percentage || 0,
      ingredients: (p.ingredients || []).map(i => ({
        ...i,
        percentage: mix > 0 ? parseFloat((((i.quantity || 0) / mix) * 100).toFixed(4)) : 0,
      })),
      is_active: p.is_active !== false,
      linked_supply_id: p.linked_supply_id,
    });
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (formData) => {
      const { subtotal, totalCost, costPerUnit } = computeCosts(formData);
      const cleanIngredients = formData.ingredients.map(({ percentage, ...rest }) => rest);

      // 1. Upsert linked Supply
      let linkedSupplyId = formData.linked_supply_id;
      const supplyPayload = {
        name: formData.name,
        sector: 'materia_prima',
        category: 'Preparado Propio',
        unit: formData.yield_unit,
        cost_per_unit: parseFloat(costPerUnit.toFixed(6)),
        stock_minimum: 0,
      };

      // Stock inicial: sólo aplica al crear (no en edición) y cuando el switch está activo.
      const initialStock = (!editing && loadInitialStock)
        ? (parseFloat(formData.yield_amount) || 0)
        : 0;

      if (linkedSupplyId) {
        await base44.entities.Supply.update(linkedSupplyId, supplyPayload);
      } else {
        const newSupply = await base44.entities.Supply.create({ ...supplyPayload, stock_current: initialStock });
        linkedSupplyId = newSupply.id;
      }

      // 2. Save Preparation
      const prepPayload = {
        name: formData.name,
        yield_amount: parseFloat(formData.yield_amount),
        yield_unit: formData.yield_unit,
        process_percentage: parseFloat(formData.process_percentage) || 0,
        ingredients: cleanIngredients,
        linked_supply_id: linkedSupplyId,
        computed_cost_total: parseFloat(totalCost.toFixed(4)),
        computed_cost_per_unit: parseFloat(costPerUnit.toFixed(6)),
        is_active: formData.is_active,
      };

      if (editing) {
        return { result: await base44.entities.Preparation.update(editing.id, prepPayload), seeded: false };
      }
      const created = await base44.entities.Preparation.create(prepPayload);
      return { result: created, seeded: initialStock > 0, initialStock, unit: formData.yield_unit };
    },
    onSuccess: ({ seeded, initialStock, unit }) => {
      qc.invalidateQueries({ queryKey: ['preparations'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      close();
      if (seeded) {
        toast.success(`Preparado creado con carga inicial de ${initialStock}${unit} en inventario.`);
      } else {
        toast.success('Preparado guardado y sincronizado con inventario');
      }
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Preparation.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparations'] });
      toast.success('Preparado eliminado');
    },
  });

  // Pre-compute ingredient check for the produce dialog
  const ingredientCheck = useMemo(() => {
    if (!produceDialog) return [];
    return (produceDialog.ingredients || []).map(ing => {
      const supply = supplies.find(s => s.id === ing.supply_id);
      if (!supply) return { name: ing.supply_name || 'Desconocido', needed: ing.quantity || 0, available: 0, unit: ing.unit || '', missing: true, notFound: true, isInfinite: false };
      const needed = ing.quantity || 0;
      const available = supply.stock_current || 0;
      const isInfinite = !!supply.is_infinite;
      return { name: supply.name, needed, available, unit: supply.unit, missing: !isInfinite && available < needed, notFound: false, isInfinite };
    });
  }, [produceDialog, supplies]);

  const missingIngredients = ingredientCheck.filter(i => i.missing);
  // En modo bypass no se requieren ingredientes ni stock — sólo suma rendimiento al insumo vinculado.
  const canProduce = produceDialog && (
    skipInventoryDeduction
      ? true
      : ((produceDialog.ingredients || []).length > 0 && missingIngredients.length === 0)
  );

  // ===== Producir Lote =====
  const produceMut = useMutation({
    mutationFn: async (prep) => {
      // Ensure linked supply exists; re-create if deleted
      let linkedId = prep.linked_supply_id;
      let linked = supplies.find(s => s.id === linkedId);
      if (!linked) {
        const newSupply = await base44.entities.Supply.create({
          name: prep.name,
          sector: 'materia_prima',
          category: 'Preparado Propio',
          unit: prep.yield_unit || 'g',
          cost_per_unit: prep.computed_cost_per_unit || 0,
          stock_current: 0,
          stock_minimum: 0,
        });
        linkedId = newSupply.id;
        linked = newSupply;
        // Update preparation with the new linked supply
        await base44.entities.Preparation.update(prep.id, { linked_supply_id: linkedId });
      }

      // BYPASS MODE — Carga Inicial / Ajuste de Saldo:
      // Omitir descuento de materia prima y sólo sumar el rendimiento al insumo vinculado.
      if (!skipInventoryDeduction) {
        for (const ing of prep.ingredients) {
          const supply = supplies.find(s => s.id === ing.supply_id);
          if (supply && !supply.is_infinite) {
            const newStock = (supply.stock_current || 0) - (ing.quantity || 0);
            await base44.entities.Supply.update(supply.id, { stock_current: newStock });
          }
        }
      }

      // Add yield to linked supply (siempre, también en carga inicial)
      const newLinkedStock = (linked.stock_current || 0) + (parseFloat(prep.yield_amount) || 0);
      await base44.entities.Supply.update(linkedId, { stock_current: newLinkedStock });

      return { prep, skipped: skipInventoryDeduction };
    },
    onSuccess: ({ prep, skipped }) => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['preparations'] });
      setProduceDialog(null);
      setSkipInventoryDeduction(false);
      if (skipped) {
        toast.success(`Carga inicial de ${prep.name} (+${prep.yield_amount}${prep.yield_unit}) sin descontar insumos.`);
      } else {
        toast.success(`Lote de ${prep.name} producido (+${prep.yield_amount}${prep.yield_unit})`);
      }
    },
    onError: (e) => {
      toast.error(e?.message || 'Error desconocido al producir lote');
    },
  });

  // ===== Ingredient handlers (bidirectional %) =====
  const addIngredient = () => {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { supply_id: '', supply_name: '', quantity: 0, unit: 'g', percentage: 0 }] }));
  };

  const updateIngredient = (idx, field, value) => {
    setForm(f => {
      const newIngs = [...f.ingredients];
      const mix = parseFloat(f.yield_amount) || 0;
      const current = { ...newIngs[idx] };

      if (field === 'supply_id') {
        current.supply_id = value;
        const supply = supplies.find(s => s.id === value);
        if (supply) { current.supply_name = supply.name; current.unit = supply.unit; }
      } else if (field === 'percentage') {
        const pct = parseFloat(value) || 0;
        current.percentage = value === '' ? '' : pct;
        current.quantity = mix > 0 ? parseFloat(((pct / 100) * mix).toFixed(4)) : 0;
      } else if (field === 'quantity') {
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

  const updateYieldAmount = (value) => {
    const newMix = parseFloat(value) || 0;
    setForm(f => ({
      ...f,
      yield_amount: newMix,
      ingredients: f.ingredients.map(ing => {
        const pct = parseFloat(ing.percentage);
        if (!isNaN(pct) && newMix > 0) {
          return { ...ing, quantity: parseFloat(((pct / 100) * newMix).toFixed(4)) };
        }
        return ing;
      }),
    }));
  };

  const removeIngredient = (idx) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preparados Propios"
        description="Sub-recetas (pastas, siropes) que se vuelven insumos del inventario"
        actions={
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo Preparado</Button>
        }
      />

      {preparations.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No hay preparados aún</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Rendimiento</TableHead>
                <TableHead className="text-right">% Proceso</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead className="text-right">Costo/Ud</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preparations.map(p => {
                const linked = supplies.find(s => s.id === p.linked_supply_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right font-mono">{p.yield_amount} {p.yield_unit}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{p.process_percentage || 0}%</TableCell>
                    <TableCell className="text-right font-mono">${(p.computed_cost_total || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${(p.computed_cost_per_unit || 0).toFixed(4)}</TableCell>
                    <TableCell className="text-right font-mono">{linked ? `${linked.stock_current} ${linked.unit}` : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setProduceDialog(p)} disabled={produceMut.isPending}>
                          <Factory className="h-3.5 w-3.5 mr-1" /> Producir
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) close(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Preparado' : 'Nuevo Preparado'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ej. Pasta de Pistacho" /></div>

            {/* Switch de carga inicial — sólo al crear (no en edición) */}
            {!editing && (
              <div className={`rounded-lg border p-3 flex items-center gap-3 ${
                loadInitialStock
                  ? 'bg-amber-50 border-amber-400'
                  : 'bg-muted/40 border-border'
              }`}>
                <Switch
                  id="seed-prep"
                  checked={loadInitialStock}
                  onCheckedChange={setLoadInitialStock}
                />
                <Label htmlFor="seed-prep" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium block leading-tight">
                    Carga Inicial / Ajuste de Saldo
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Info className="h-3 w-3" />
                    Crear con stock = {parseFloat(form.yield_amount) || 0}{form.yield_unit} y sin descontar Materia Prima
                  </span>
                </Label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mix Deseado</Label>
                <Input type="number" step="0.01" value={form.yield_amount} onChange={e => updateYieldAmount(e.target.value)} />
              </div>
              <div>
                <Label>Unidad</Label>
                <Select value={form.yield_unit} onValueChange={v => setForm({ ...form, yield_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramos</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>% Proceso</Label>
                <Input type="number" step="0.1" value={form.process_percentage} onChange={e => setForm({ ...form, process_percentage: e.target.value })} />
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
                  <span>Insumo</span><span className="text-right">%</span><span className="text-right">Cantidad</span><span></span>
                </div>
              )}

              <div className="space-y-2">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,72px,90px,32px] gap-2 items-center">
                    <SearchableCombobox
                      value={ing.supply_id}
                      onChange={v => updateIngredient(idx, 'supply_id', v)}
                      options={rawMaterials.map(s => ({
                        value: s.id,
                        label: s.name,
                        sublabel: `(${s.unit})`,
                      }))}
                      placeholder="Insumo"
                      searchPlaceholder="Buscar insumo..."
                      emptyText="Sin insumos"
                    />
                    <Input type="number" step="0.01" placeholder="%" value={ing.percentage ?? ''} onChange={e => updateIngredient(idx, 'percentage', e.target.value)} className="text-right" />
                    <div className="relative">
                      <Input type="number" step="0.01" placeholder="0" value={ing.quantity || ''} onChange={e => updateIngredient(idx, 'quantity', e.target.value)} className="text-right pr-7" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{ing.unit}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeIngredient(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              {form.ingredients.length > 0 && (
                <div className={`mt-3 rounded-lg border p-2.5 flex items-center justify-between text-sm ${
                  isBalanced ? 'bg-green-50 border-green-300 text-green-700' : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}>
                  <span className="font-medium">{isBalanced ? '✓ Receta balanceada' : '⚠ La receta no suma 100%'}</span>
                  <span className="font-mono font-bold">{totalPercentage.toFixed(2)}%</span>
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal insumos:</span>
                <span className="font-mono">${costs.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>+ Proceso ({form.process_percentage || 0}%):</span>
                <span className="font-mono">${(costs.totalCost - costs.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-primary/20 pt-1 mt-1">
                <span>Costo Total:</span>
                <span className="font-mono">${costs.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Costo / {form.yield_unit}:</span>
                <span className="font-mono">${costs.costPerUnit.toFixed(4)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de producción con verificación de ingredientes */}
      <Dialog open={!!produceDialog} onOpenChange={(o) => { if (!o) { setProduceDialog(null); setSkipInventoryDeduction(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producir Lote — {produceDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Switch: Carga Inicial / Ajuste de Saldo (bypass de descuento) */}
            <div className={`rounded-lg border p-3 flex items-center gap-3 ${
              skipInventoryDeduction
                ? 'bg-amber-50 border-amber-400'
                : 'bg-muted/40 border-border'
            }`}>
              <Switch
                id="bypass-prep"
                checked={skipInventoryDeduction}
                onCheckedChange={setSkipInventoryDeduction}
              />
              <Label htmlFor="bypass-prep" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium block leading-tight">Carga Inicial / Ajuste de Saldo</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Info className="h-3 w-3" />
                  No descontar Materia Prima
                </span>
              </Label>
            </div>

            <p className="text-sm text-muted-foreground">
              {skipInventoryDeduction
                ? <>Se sumarán <strong className="text-foreground">{produceDialog?.yield_amount} {produceDialog?.yield_unit}</strong> al stock como carga inicial, sin descontar insumos.</>
                : <>Se producirán <strong className="text-foreground">{produceDialog?.yield_amount} {produceDialog?.yield_unit}</strong> y se descontarán los insumos.</>
              }
            </p>

            {!skipInventoryDeduction && (produceDialog?.ingredients || []).length === 0 ? (
              <div className="border rounded-lg p-3 bg-amber-50 border-amber-300 text-amber-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Este preparado no tiene ingredientes. Edítalo primero.
              </div>
            ) : !skipInventoryDeduction && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className={`px-3 py-2 flex items-center gap-2 text-sm font-medium ${
                  missingIngredients.length > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {missingIngredients.length > 0 ? (
                    <><AlertTriangle className="h-4 w-4" /> Faltan {missingIngredients.length} insumo(s)</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Inventario suficiente</>
                  )}
                </div>
                <div className="divide-y divide-border max-h-56 overflow-y-auto">
                  {ingredientCheck.map((ing, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className={`truncate ${ing.missing ? 'text-destructive font-medium' : ''}`}>
                          {ing.name}
                          {ing.notFound && <span className="text-xs ml-1">(no encontrado)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Requiere: {ing.needed.toFixed(1)}{ing.unit}
                          {!ing.isInfinite && !ing.notFound && (
                            <> · Disponible: {ing.available?.toFixed(1)}{ing.unit}</>
                          )}
                          {ing.isInfinite && <> · (ilimitado)</>}
                        </p>
                      </div>
                      {ing.missing ? (
                        <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 flex-shrink-0">
                          Falta {Math.max(0, ing.needed - ing.available).toFixed(1)}{ing.unit}
                        </Badge>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProduceDialog(null); setSkipInventoryDeduction(false); }}>Cancelar</Button>
            <Button onClick={() => produceMut.mutate(produceDialog)} disabled={!canProduce || produceMut.isPending}>
              {produceMut.isPending ? 'Produciendo...' : (skipInventoryDeduction ? 'Registrar Carga Inicial' : 'Producir Lote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}