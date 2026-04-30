import React, { useState } from 'react';
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
import { Plus, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'lacteo', label: 'Lácteo' },
  { value: 'fruta', label: 'Fruta' },
  { value: 'cafe', label: 'Café' },
  { value: 'endulzante', label: 'Endulzante' },
  { value: 'adicional', label: 'Adicional' },
  { value: 'empaque', label: 'Empaque' },
  { value: 'otro', label: 'Otro' },
];

const emptySupply = { name: '', category: 'otro', unit: 'g', stock_current: 0, stock_minimum: 0, cost_per_unit: 0, supplier: '', purchase_price: '', yield_amount: '' };

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupply);
  const [search, setSearch] = useState('');
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

  const close = () => { setDialogOpen(false); setEditing(null); setForm(emptySupply); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, unit: s.unit, stock_current: s.stock_current, stock_minimum: s.stock_minimum, cost_per_unit: s.cost_per_unit, supplier: s.supplier || '', purchase_price: '', yield_amount: '' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const { purchase_price, yield_amount, ...apiData } = form;
    if (editing) {
      updateMut.mutate({ id: editing.id, data: apiData });
    } else {
      createMut.mutate(apiData);
    }
  };

  const filtered = supplies.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de Insumos"
        description="Gestión de materia prima"
        actions={
          <Button onClick={() => { setForm(emptySupply); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Agregar Insumo
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Costo/Ud</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay insumos registrados</TableCell></TableRow>
            ) : (
              filtered.map(s => {
                const isLow = s.stock_minimum && s.stock_current <= s.stock_minimum;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        {s.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORIES.find(c => c.value === s.category)?.label || s.category}</Badge>
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
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Stock Actual</Label><Input type="number" value={form.stock_current} onChange={e => setForm({ ...form, stock_current: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Stock Mínimo</Label><Input type="number" value={form.stock_minimum} onChange={e => setForm({ ...form, stock_minimum: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Costo por Unidad ($)</Label><Input type="number" step="0.0001" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Proveedor</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
            </div>

            {/* Calculadora de costos */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calculadora de Costos (Opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Precio del empaque ($)</Label>
                  <Input
                    type="number" step="0.01" placeholder="ej. 180"
                    value={form.purchase_price}
                    onChange={e => {
                      const price = parseFloat(e.target.value) || 0;
                      const qty = parseFloat(form.yield_amount) || 0;
                      setForm(f => ({ ...f, purchase_price: e.target.value, cost_per_unit: qty > 0 ? parseFloat((price / qty).toFixed(6)) : f.cost_per_unit }));
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">¿Cuántos {form.unit} trae?</Label>
                  <Input
                    type="number" step="1" placeholder="ej. 25000"
                    value={form.yield_amount}
                    onChange={e => {
                      const qty = parseFloat(e.target.value) || 0;
                      const price = parseFloat(form.purchase_price) || 0;
                      setForm(f => ({ ...f, yield_amount: e.target.value, cost_per_unit: qty > 0 ? parseFloat((price / qty).toFixed(6)) : f.cost_per_unit }));
                    }}
                  />
                </div>
              </div>
              {parseFloat(form.purchase_price) > 0 && parseFloat(form.yield_amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  → Costo calculado: <strong className="text-foreground">${(parseFloat(form.purchase_price) / parseFloat(form.yield_amount)).toFixed(4)}</strong> por {form.unit}
                </p>
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