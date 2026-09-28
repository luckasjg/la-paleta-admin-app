import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function StaffBonusForm({ staff, onOpenChange, onSaved }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (staff) setF({ position: '', bonus_enabled: false, weekly_bonus: [], discount_percentage: 0, bonus_reset_day: 1, ...staff }); }, [staff]);
  const { data: products = [] } = useQuery({
    queryKey: ['bonus_products'], enabled: !!staff,
    queryFn: async () => (await base44.entities.Product.filter({ is_active: { $ne: false } }, { sort: 'name', limit: 500, fields: ['name'] })).items,
  });
  if (!f || !staff) return null;
  const setBonus = (i, patch) => setF(p => ({ ...p, weekly_bonus: p.weekly_bonus.map((b, j) => j === i ? { ...b, ...patch } : b) }));

  const save = async () => {
    setSaving(true);
    await base44.entities.StaffPOS.update(staff.id, {
      position: f.position, bonus_enabled: f.bonus_enabled, bonus_unlimited: !!f.bonus_unlimited, bonus_mode: f.bonus_mode || 'producto',
      weekly_bonus_amount_usd: Number(f.weekly_bonus_amount_usd) || 0, bonus_reset_day: Number(f.bonus_reset_day),
      discount_percentage: Number(f.discount_percentage) || 0,
      weekly_bonus: f.weekly_bonus.filter(b => b.product_id).map(b => ({ ...b, quantity_per_week: Number(b.quantity_per_week) || 0 })),
    });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={!!staff} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{staff.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Cargo</Label><Input value={f.position || ''} onChange={e => setF({ ...f, position: e.target.value })} placeholder="Ej. Heladero, Gerente" /></div>
          <div className="flex items-center justify-between"><Label>Bono semanal activo</Label><Switch checked={f.bonus_enabled} onCheckedChange={v => setF({ ...f, bonus_enabled: v })} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Cortesía ilimitada</Label><p className="text-xs text-muted-foreground">Todo lo que pida sale gratis, sin cupo semanal</p></div>
            <Switch checked={!!f.bonus_unlimited} onCheckedChange={v => setF({ ...f, bonus_unlimited: v, ...(v ? { bonus_enabled: true } : {}) })} />
          </div>
          {!f.bonus_unlimited && <>
          <div className="space-y-1"><Label>Tipo de cupo semanal</Label>
            <Select value={f.bonus_mode || 'producto'} onValueChange={v => setF({ ...f, bonus_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="producto">Por producto</SelectItem><SelectItem value="monto">Por monto $</SelectItem></SelectContent>
            </Select></div>
          {f.bonus_mode === 'monto' ? (
            <div className="space-y-1"><Label>Cupo semanal (USD base)</Label>
              <Input type="number" min={0} step="0.01" value={f.weekly_bonus_amount_usd ?? 0} onChange={e => setF({ ...f, weekly_bonus_amount_usd: e.target.value })} /></div>
          ) : (
          <div className="space-y-2">
            <Label>Productos de cortesía por semana</Label>
            {f.weekly_bonus.map((b, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1 min-w-0"><SearchableCombobox value={b.product_id} options={products.map(p => ({ value: p.id, label: p.name }))}
                  onChange={id => setBonus(i, { product_id: id, product_name: products.find(p => p.id === id)?.name })} placeholder="Producto" /></div>
                <Input type="number" className="w-20" value={b.quantity_per_week} onChange={e => setBonus(i, { quantity_per_week: e.target.value })} />
                <Button size="icon" variant="ghost" onClick={() => setF({ ...f, weekly_bonus: f.weekly_bonus.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setF({ ...f, weekly_bonus: [...f.weekly_bonus, { product_id: '', product_name: '', quantity_per_week: 1 }] })}><Plus className="h-4 w-4" /> Agregar producto</Button>
          </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>% descuento al exceder</Label><Input type="number" value={f.discount_percentage} onChange={e => setF({ ...f, discount_percentage: e.target.value })} /></div>
            <div className="space-y-1"><Label>Reinicio semanal</Label>
              <Select value={String(f.bonus_reset_day)} onValueChange={v => setF({ ...f, bonus_reset_day: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          </>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}