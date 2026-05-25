import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const CATEGORIES = [
  { value: 'alquiler', label: 'Alquiler', type: 'fijo' },
  { value: 'sueldos_fijos', label: 'Sueldos Fijos', type: 'fijo' },
  { value: 'software', label: 'Software / Suscripciones', type: 'fijo' },
  { value: 'servicios', label: 'Servicios (luz, agua, internet)', type: 'fijo' },
  { value: 'otros_fijos', label: 'Otros Fijos', type: 'fijo' },
  { value: 'mantenimiento', label: 'Mantenimiento', type: 'variable' },
  { value: 'imprevistos', label: 'Imprevistos', type: 'variable' },
  { value: 'otros_variables', label: 'Otros Variables', type: 'variable' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));
export const CATEGORY_TYPE = Object.fromEntries(CATEGORIES.map(c => [c.value, c.type]));

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ open, onOpenChange, onSubmit, initialValue }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'alquiler',
    date: today(),
    notes: '',
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        description: initialValue.description || '',
        amount: initialValue.amount ?? '',
        category: initialValue.category || 'alquiler',
        date: initialValue.date || today(),
        notes: initialValue.notes || '',
      });
    } else {
      setForm({ description: '', amount: '', category: 'alquiler', date: today(), notes: '' });
    }
  }, [initialValue, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || !amount || amount <= 0) return;
    onSubmit({
      description: form.description.trim(),
      amount,
      category: form.category,
      type: CATEGORY_TYPE[form.category],
      date: form.date,
      notes: form.notes?.trim() || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValue ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="ej. Alquiler de mayo"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Monto (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground font-semibold">Fijos</div>
                {CATEGORIES.filter(c => c.type === 'fijo').map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
                <div className="px-2 py-1 mt-1 text-[10px] uppercase text-muted-foreground font-semibold">Variables</div>
                {CATEGORIES.filter(c => c.type === 'variable').map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tipo: <span className="font-semibold">{CATEGORY_TYPE[form.category]}</span>
            </p>
          </div>
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{initialValue ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}