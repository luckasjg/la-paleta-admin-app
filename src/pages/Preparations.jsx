import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, FlaskConical, Factory, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

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
  const [stockAlert, setStockAlert] = useState(null); // { prepName, missing: [{ name, needed, have, unit }] }
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
  const rawMaterials = useMemo(() =>
    supplies.filter(s => s.sector === 'materia_prima' && s.category !== 'Preparado Propio'),
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
  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptyPrep); };

  const openNew = () => { setForm(emptyPrep); setEditing(null); setDialogOpen(true); };

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

      if (linkedSupplyId) {
        await base44.entities.Supply.update(linkedSupplyId, supplyPayload);
      } else {
        const newSupply = await base44.entities.Supply.create({ ...supplyPayload, stock_current: 0 });
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
        return base44.entities.Preparation.update(editing.id, prepPayload);
      }
      return base44.entities.Preparation.create(prepPayload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparations'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      close();
      toast.success('Preparado guardado y sincronizado con inventario');
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

  // ===== Validación de stock previa =====
  const handleProduceClick = (prep) => {
    if (!prep.ingredients || prep.ingredients.length === 0) {
      toast.error('Este preparado no tiene ingredientes definidos. Edítalo primero.');
      return;
    }
    if (!prep.linked_supply_id || !supplies.find(s => s.id === prep.linked_supply_id)) {
      toast.error('Falta el insumo vinculado. Edita y guarda el preparado.');
      return;
    }

    const missing = [];
    for (const ing of prep.ingredients) {
      const supply = supplies.find(s => s.id === ing.supply_id);
      if (!supply) {
        missing.push({ name: ing.supply_name || 'Insumo desconocido', needed: ing.quantity || 0, have: 0, unit: ing.unit || '', notFound: true });
        continue;
      }
      if (!supply.is_infinite && (supply.stock_current || 0) < (ing.quantity || 0)) {
        missing.push({
          name: supply.name,
          needed: ing.quantity || 0,
          have: supply.stock_current || 0,
          unit: supply.unit,
        });
      }
    }

    if (missing.length > 0) {
      setStockAlert({ prepName: prep.name, missing });
      return;
    }

    produceMut.mutate(prep);
  };

  // ===== Producir Lote =====
  const produceMut = useMutation({
    mutationFn: async (prep) => {
      console.log('[Producir] Iniciando lote', prep);
      const linked = supplies.find(s => s.id === prep.linked_supply_id);

      // Deduct raw materials
      for (const ing of prep.ingredients) {
        const supply = supplies.find(s => s.id === ing.supply_id);
        if (supply && !supply.is_infinite) {
          const newStock = (supply.stock_current || 0) - (ing.quantity || 0);
          console.log(`[Producir] Descontando ${ing.quantity}${supply.unit} de ${supply.name} (${supply.stock_current} -> ${newStock})`);
          await base44.entities.Supply.update(supply.id, { stock_current: newStock });
        }
      }

      // Add yield to linked supply
      const newLinkedStock = (linked.stock_current || 0) + (parseFloat(prep.yield_amount) || 0);
      console.log(`[Producir] Sumando ${prep.yield_amount}${linked.unit} a ${linked.name} (${linked.stock_current} -> ${newLinkedStock})`);
      await base44.entities.Supply.update(linked.id, { stock_current: newLinkedStock });

      return prep;
    },
    onSuccess: (prep) => {
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['preparations'] });
      toast.success(`Lote de ${prep.name} producido (+${prep.yield_amount}${prep.yield_unit})`);
    },
    onError: (e) => {
      console.error('[Producir] Error:', e);
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
                        <Button variant="outline" size="sm" onClick={() => handleProduceClick(p)} disabled={produceMut.isPending}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Preparado' : 'Nuevo Preparado'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ej. Pasta de Pistacho" /></div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mix Deseado</Label>
                <Input type="number" value={form.yield_amount} onChange={e => updateYieldAmount(e.target.value)} />
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
                    <Select value={ing.supply_id} onValueChange={v => updateIngredient(idx, 'supply_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Insumo" /></SelectTrigger>
                      <SelectContent>
                        {rawMaterials.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
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

      {/* Alerta de stock insuficiente */}
      <AlertDialog open={!!stockAlert} onOpenChange={(o) => !o && setStockAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Stock insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription>
              No se puede producir el lote de <strong>{stockAlert?.prepName}</strong> porque faltan los siguientes insumos:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 divide-y divide-destructive/20">
            {stockAlert?.missing.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  {m.notFound && <p className="text-xs text-destructive">No existe en inventario</p>}
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="text-destructive">Falta: <strong>{(m.needed - m.have).toFixed(2)}{m.unit}</strong></p>
                  <p className="text-muted-foreground">Necesita {m.needed}{m.unit} · Hay {m.have}{m.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setStockAlert(null)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}