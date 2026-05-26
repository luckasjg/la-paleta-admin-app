import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/lib/usePaymentMethods';
import { ICON_OPTIONS, getIconComponent, slugifyValue } from '@/lib/paymentMethods';

const emptyMethod = {
  label: '',
  currency: 'VES',
  icon: 'CreditCard',
  is_active: true,
  sort_order: 99,
  notes: '',
};

export default function PaymentMethodsManager({ open, onOpenChange }) {
  const qc = useQueryClient();
  const { methods } = usePaymentMethods();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMethod);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setForm(emptyMethod);
    }
  }, [open]);

  const saveMut = useMutation({
    mutationFn: async (data) => {
      // Releer en vivo para evitar colisiones por cache desactualizado
      const fresh = await base44.entities.PaymentMethod.list();
      const allValues = fresh.map(m => m.value);

      if (editing) {
        // Si se renombra un método legacy, asignar un value nuevo único
        // (preserva el histórico apuntando al value original).
        const labelChanged = data.label?.trim() !== editing.label;
        if (editing.is_legacy && labelChanged) {
          const newValue = slugifyValue(data.label, allValues, editing.value);
          await base44.entities.PaymentMethod.update(editing.id, {
            ...data,
            value: newValue,
            is_legacy: false,
          });
        } else {
          await base44.entities.PaymentMethod.update(editing.id, data);
        }
      } else {
        // CREACIÓN: garantizar value único contra TODOS los existentes
        const value = slugifyValue(data.label, allValues);
        await base44.entities.PaymentMethod.create({ ...data, value });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_methods'] });
      toast.success(editing ? 'Método actualizado' : 'Método creado');
      setEditing(null);
      setForm(emptyMethod);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.PaymentMethod.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_methods'] });
      toast.success('Método eliminado');
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PaymentMethod.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment_methods'] }),
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (m) => {
    setEditing(m);
    setForm({
      label: m.label,
      currency: m.currency,
      icon: m.icon || 'CreditCard',
      is_active: m.is_active !== false,
      sort_order: m.sort_order ?? 99,
      notes: m.notes || '',
    });
  };

  const handleSubmit = () => {
    if (!form.label?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    saveMut.mutate({
      label: form.label.trim(),
      currency: form.currency,
      icon: form.icon,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 99,
      notes: form.notes,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyMethod);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-x-hidden">
        <DialogHeader className="px-6 pt-6 flex-shrink-0">
          <DialogTitle>Gestor de Métodos de Pago</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Crea variantes (ej. "Punto de Venta 2", "Pago Móvil Banesco") y vincúlalas a billeteras independientes.
          </p>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5">
          {/* Formulario */}
          <div className="border border-border rounded-lg p-3 bg-secondary/30 space-y-3">
            <p className="text-sm font-semibold">
              {editing ? `Editar: ${editing.label}` : 'Nuevo método'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre visible</Label>
                <Input
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Ej. Punto de Venta 2"
                />
              </div>
              <div>
                <Label className="text-xs">Moneda</Label>
                <Select
                  value={form.currency}
                  onValueChange={v => setForm({ ...form, currency: v })}
                  disabled={editing?.is_legacy}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VES">VES (Bs.)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
                {editing?.is_legacy && (
                  <p className="text-[10px] text-muted-foreground mt-1">No editable en método del sistema</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Ícono</Label>
                <Select value={form.icon} onValueChange={v => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(name => {
                      const Icon = getIconComponent(name);
                      return (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" /> {name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Orden</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm({ ...form, is_active: v })}
                />
                <Label className="text-xs">Activo en POS</Label>
              </div>
              <div className="flex gap-2">
                {editing && (
                  <Button variant="outline" size="sm" onClick={cancelEdit}>Cancelar</Button>
                )}
                <Button size="sm" onClick={handleSubmit} disabled={saveMut.isPending}>
                  {editing ? <><Pencil className="h-3.5 w-3.5 mr-1" /> Actualizar</> : <><Plus className="h-3.5 w-3.5 mr-1" /> Crear</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de métodos */}
          <div>
            <p className="text-sm font-semibold mb-2">Métodos existentes ({methods.length})</p>
            <div className="space-y-1.5">
              {methods.map(m => {
                const Icon = getIconComponent(m.icon);
                return (
                  <div key={m.id} className="flex items-center gap-2 border border-border rounded-md p-2 bg-card">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{m.label}</span>
                        <Badge variant={m.currency === 'USD' ? 'default' : 'secondary'} className="text-[9px]">
                          {m.currency}
                        </Badge>
                        {m.is_legacy && (
                          <Badge variant="outline" className="text-[9px]">sistema</Badge>
                        )}
                        {m.is_active === false && (
                          <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">inactivo</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{m.value}</p>
                    </div>
                    <Switch
                      checked={m.is_active !== false}
                      onCheckedChange={(v) => toggleActive.mutate({ id: m.id, is_active: v })}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(m)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!m.is_legacy ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar método "{m.label}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Las ventas históricas que usaron este método seguirán mostrándolo.
                              Las billeteras vinculadas dejarán de recibir depósitos automáticos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(m.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled title="Método del sistema (no se puede eliminar)">
                        <Trash2 className="h-3 w-3 opacity-30" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {methods.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">
                  <CreditCard className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  Sin métodos. Se crearán los predeterminados automáticamente.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}