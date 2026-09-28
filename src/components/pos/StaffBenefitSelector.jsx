import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

export default function StaffBenefitSelector({ staff, onChange, balance }) {
  const { data: list = [] } = useQuery({
    queryKey: ['bonus_staff'],
    queryFn: async () => (await base44.entities.StaffPOS.filter({ bonus_enabled: true, is_active: { $ne: false } }, { limit: 200 })).items,
  });
  if (!staff) {
    if (!list.length) return null;
    return (
      <SearchableCombobox value="" onChange={id => onChange(list.find(s => s.id === id))}
        options={list.map(s => ({ value: s.id, label: s.full_name, sublabel: s.position }))}
        placeholder="Colaborador con bono (opcional)" searchPlaceholder="Buscar colaborador..." />
    );
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1">
      <div className="flex items-center gap-1.5">
        <BadgeCheck className="h-4 w-4 text-primary" />
        <span className="font-semibold flex-1 truncate">{staff.full_name}{staff.position ? ` · ${staff.position}` : ''}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}><X className="h-3.5 w-3.5" /></Button>
      </div>
      {staff.bonus_unlimited && <p className="text-primary font-medium">Cortesía ilimitada · todo el pedido es gratis</p>}
      {!staff.bonus_unlimited && (staff.weekly_bonus || []).map(b => (
        <div key={b.product_id} className="flex justify-between text-muted-foreground">
          <span className="truncate">{b.product_name}</span>
          <span className="font-mono">{balance ? balance[b.product_id] ?? 0 : '…'} / {b.quantity_per_week} disp.</span>
        </div>
      ))}
      {staff.discount_percentage > 0 && <p className="text-[10px] text-muted-foreground">Excedente con {staff.discount_percentage}% de descuento</p>}
    </div>
  );
}