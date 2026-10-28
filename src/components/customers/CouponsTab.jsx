import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Ticket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CouponsTab({ customer }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState('Cupón de bienvenida');
  const key = ['coupons', customer.id];
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.CustomerCoupon.filter({ customer_id: customer.id }, '-created_date', 100),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const assign = async () => {
    if (!title.trim()) return;
    await base44.entities.CustomerCoupon.create({ customer_id: customer.id, customer_name: customer.full_name, title: title.trim(), status: 'activo' });
    refresh();
  };
  const redeem = async (c) => {
    await base44.entities.CustomerCoupon.update(c.id, { status: 'canjeado', redeemed_at: new Date().toISOString(), redeemed_by: user?.full_name || user?.email });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del bono" />
        <Button onClick={assign}><Plus className="h-4 w-4" /> Asignar</Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p> :
        coupons.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin bonos asignados.</p> :
        <div className="space-y-2">{coupons.map(c => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Ticket className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground">
                Asignado {format(new Date(c.created_date), 'dd/MM/yyyy')}
                {c.redeemed_at && ` · Canjeado ${format(new Date(c.redeemed_at), 'dd/MM/yyyy HH:mm')}`}
              </p>
            </div>
            {c.status === 'activo' ? <Button size="sm" onClick={() => redeem(c)}>Canjear</Button> : <Badge variant="secondary">Canjeado</Badge>}
          </div>))}</div>}
    </div>
  );
}