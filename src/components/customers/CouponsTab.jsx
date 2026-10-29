import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import CouponItem from './CouponItem';
import { toast } from '@/components/ui/use-toast';
import CouponFormDialog from './CouponFormDialog';

export default function CouponsTab({ customer }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dialog, setDialog] = useState({ open: false, coupon: null });
  const key = ['coupons', customer.id];
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.CustomerCoupon.filter({ customer_id: customer.id }, '-created_date', 100),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const who = user?.full_name || user?.email;
  const E = base44.entities.CustomerCoupon;

  const save = async (data) => {
    if (dialog.coupon) await E.update(dialog.coupon.id, data);
    else {
      const created = await E.create({ ...data, customer_id: customer.id, customer_name: customer.full_name, status: 'activo' });
      refresh();
      const { data: r } = await base44.functions.invoke('sendCouponEmail', { coupon_id: created.id }).catch(() => ({ data: { sent: false } }));
      if (r?.sent) toast({ title: 'Cupón enviado por email', description: r.email });
      else toast({ title: 'Cupón guardado', description: r?.reason === 'no_email' ? 'El cliente no tiene email: no se envió la notificación.' : 'No se pudo enviar el email al cliente.', variant: 'destructive' });
      return;
    }
    refresh();
  };
  const run = (fn) => async () => { await fn(); refresh(); };

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setDialog({ open: true, coupon: null })}><Plus className="h-4 w-4" /> Asignar cupón</Button>
      {isLoading ? <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p> :
        coupons.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin bonos asignados.</p> :
        <div className="space-y-2">{coupons.map(c => (
          <CouponItem key={c.id} coupon={c}
            onEdit={() => setDialog({ open: true, coupon: c })}
            onRedeem={run(() => E.update(c.id, { status: 'canjeado', redeemed_at: new Date().toISOString(), redeemed_by: who }))}
            onDelete={run(() => E.delete(c.id))}
            onVoid={run(() => E.update(c.id, { status: 'anulado', voided_at: new Date().toISOString(), voided_by: who }))}
          />))}</div>}
      <CouponFormDialog open={dialog.open} coupon={dialog.coupon} onOpenChange={(open) => setDialog(s => ({ ...s, open }))} onSave={save} />
    </div>
  );
}