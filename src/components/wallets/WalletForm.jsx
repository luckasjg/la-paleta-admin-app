import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { usePaymentMethods } from '@/lib/usePaymentMethods';

const empty = {
  name: '',
  currency: 'USD',
  balance: 0,
  payment_methods: [],
  is_active: true,
  notes: '',
};

export default function WalletForm({ open, onOpenChange, wallet, onSave, isEditing }) {
  const [form, setForm] = useState(empty);
  const { posMethods } = usePaymentMethods({ activeOnly: true });

  useEffect(() => {
    if (open) setForm(wallet ? { ...empty, ...wallet } : empty);
  }, [open, wallet]);

  const toggleMethod = (m) => {
    setForm(f => {
      const list = f.payment_methods || [];
      return {
        ...f,
        payment_methods: list.includes(m) ? list.filter(x => x !== m) : [...list, m],
      };
    });
  };

  // Solo mostrar métodos compatibles con la moneda seleccionada
  const compatibleMethods = posMethods.filter(m => m.defaultCurrency === form.currency);

  const handleSave = () => {
    if (!form.name?.trim()) return;
    onSave({
      ...form,
      balance: parseFloat(form.balance) || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Billetera' : 'Nueva Billetera'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Caja Fuerte USD"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={v => setForm({ ...form, currency: v, payment_methods: [] })}
                disabled={isEditing}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="VES">VES</SelectItem>
                </SelectContent>
              </Select>
              {isEditing && <p className="text-[10px] text-muted-foreground mt-1">No editable</p>}
            </div>
            <div>
              <Label className="text-xs">
                Saldo {isEditing ? 'actual' : 'inicial'} ({form.currency})
              </Label>
              <Input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={e => setForm({ ...form, balance: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Métodos de pago vinculados</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Los pagos por estos métodos se depositarán automáticamente aquí
            </p>
            <div className="space-y-1.5 border border-border rounded-lg p-2">
              {compatibleMethods.map(m => (
                <label key={m.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer">
                  <Checkbox
                    checked={(form.payment_methods || []).includes(m.value)}
                    onCheckedChange={() => toggleMethod(m.value)}
                  />
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
              {compatibleMethods.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No hay métodos para esta moneda</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <Label className="text-sm">Billetera activa</Label>
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={v => setForm({ ...form, is_active: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}