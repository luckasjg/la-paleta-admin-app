import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Repeat } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ open, onOpenChange, onSubmit, initialValue, categories }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'fijo',
    category: '',
    date: today(),
    is_recurring: false,
    recurring_active: true,
    recurring_end_date: '',
    notes: '',
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        description: initialValue.description || '',
        amount: initialValue.amount ?? '',
        type: initialValue.type || 'fijo',
        category: initialValue.category || '',
        date: initialValue.date || today(),
        is_recurring: !!initialValue.is_recurring,
        recurring_active: initialValue.recurring_active !== false,
        recurring_end_date: initialValue.recurring_end_date || '',
        notes: initialValue.notes || '',
      });
    } else {
      setForm({
        description: '', amount: '', type: 'fijo', category: '',
        date: today(), is_recurring: false, recurring_active: true,
        recurring_end_date: '', notes: '',
      });
    }
  }, [initialValue, open]);

  const availableCats = categories[form.type] || [];

  // Auto-pick first category if current is invalid
  useEffect(() => {
    if (!availableCats.includes(form.category) && availableCats.length > 0) {
      setForm(f => ({ ...f, category: availableCats[0] }));
    }
  }, [form.type, availableCats, form.category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || !amount || amount <= 0 || !form.category) return;
    onSubmit({
      description: form.description.trim(),
      amount,
      type: form.type,
      category: form.category,
      date: form.date,
      is_recurring: form.is_recurring,
      recurring_active: form.is_recurring ? form.recurring_active : false,
      recurring_end_date: form.is_recurring ? (form.recurring_end_date || null) : null,
      notes: form.notes?.trim() || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValue ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="ej. Alquiler local"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Monto (USD)</Label>
              <Input
                type="number" step="0.01" min="0"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fijo">Fijo</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
                disabled={availableCats.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={availableCats.length ? 'Selecciona...' : 'Crea categorías primero'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurring switch */}
          <div className="rounded-lg border p-3 space-y-3 bg-secondary/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Gasto Fijo Recurrente</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Se aplicará automáticamente a todos los meses siguientes
                  </p>
                </div>
              </div>
              <Switch
                checked={form.is_recurring}
                onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
              />
            </div>

            {form.is_recurring && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="flex items-center justify-between col-span-2">
                  <Label className="text-xs">Recurrencia activa</Label>
                  <Switch
                    checked={form.recurring_active}
                    onCheckedChange={(v) => setForm({ ...form, recurring_active: v })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Fin de recurrencia (opcional)</Label>
                  <Input
                    type="date"
                    value={form.recurring_end_date}
                    onChange={e => setForm({ ...form, recurring_end_date: e.target.value })}
                  />
                </div>
              </div>
            )}
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
            <Button type="submit" disabled={!form.category}>{initialValue ? 'Guardar' : 'Crear'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}