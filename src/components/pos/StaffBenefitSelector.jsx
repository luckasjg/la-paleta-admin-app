import React, { useState } from 'react';
import StaffPinDialog from '@/components/pos/StaffPinDialog';
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
  const [pending, setPending] = useState(null);
  if (!staff) {
    if (!list.length) return null;
    const pick = (id) => {
      const s = list.find(x => x.id === id);
      if (s?.bonus_unlimited) setPending(s); else onChange(s);
    };
    return (
      <>
        <SearchableCombobox value="" onChange={pick}
          options={list.map(s => ({ value: s.id, label: s.full_name, sublabel: s.bonus_unlimited ? 'Ilimitado · requiere PIN' : s.position }))}
          placeholder="Colaborador con bono (opcional)" searchPlaceholder="Buscar colaborador..." />
        {pending && <StaffPinDialog staff={pending} onCancel={() => setPending(null)} onValid={s => { setPending(null); onChange(s); }} />}
      </>
    );
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1">
      <div className="flex items-center gap-1.5">
        <BadgeCheck className="h-4 w-4 text-primary" />
        <span className="font-semibold flex-1 truncate">{staff.full_name}{staff.position ? ` · ${staff.position}` : ''}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}><X className="h-3.5 w-3.5" /></Button>
      </div>
      {staff.bonus_unlimited && <p className="text-primary font-medium">Cortesía ilimitada · PIN validado para esta venta</p>}
      {!staff.bonus_unlimited && staff.bonus_mode === 'monto' && (
        <div className="flex justify-between text-muted-foreground">
          <span>Cupo semanal en monto</span>
          <span className="font-mono">{balance ? `$${(balance.__monto__ ?? 0).toFixed(2)}` : '…'} / ${(staff.weekly_bonus_amount_usd || 0).toFixed(2)}</span>
        </div>
      )}
      {!staff.bonus_unlimited && staff.bonus_mode !== 'monto' && (staff.weekly_bonus || []).map(b => (
        <div key={b.product_id} className="flex justify-between text-muted-foreground">
          <span className="truncate">{b.product_name}</span>
          <span className="font-mono">{balance ? balance[b.product_id] ?? 0 : '…'} / {b.quantity_per_week} disp.</span>
        </div>
      ))}
      {staff.discount_percentage > 0 && <p className="text-[10px] text-muted-foreground">Excedente con {staff.discount_percentage}% de descuento</p>}
    </div>
  );
}