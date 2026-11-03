import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, IceCream, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import DispatchOrderCard from '@/components/dispatch/DispatchOrderCard';
import ServeFlavorsDialog from '@/components/dispatch/ServeFlavorsDialog';

export default function DispatchKDS() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState(null); // { order, index }

  // Ventas pendientes de despacho de las últimas 24h, la más antigua primero (FIFO)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['sales', 'pending_dispatch'],
    queryFn: async () => {
      const page = await base44.entities.Sale.filter(
        { status: 'completed', dispatch_status: 'pendiente', sale_date: { $gte: moment().subtract(24, 'hours').toISOString() } },
        { sort: 'sale_date', limit: 50 }
      );
      return page.items;
    },
    refetchInterval: 5000,
  });

  const { data: trays = [] } = useQuery({
    queryKey: ['trays', 'vitrine'],
    queryFn: () => base44.entities.Tray.filter({ status: 'activa', in_vitrine: true }),
    refetchInterval: 10000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const item = selection ? selection.order.items?.[selection.index] : null;
  const product = item ? products.find(p => p.id === item.product_id) : null;
  const maxFlavors = Math.max(1, product?.max_flavors || product?.flavor_count || 1);

  const dispatch = useMutation({
    mutationFn: (units) => base44.functions.invoke('dispatchSaleItem', {
      sale_id: selection.order.id,
      item_index: selection.index,
      units,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['trays'] });
      toast.success('¡Helado despachado y gramos descontados!');
      setSelection(null);
    },
    onError: (err) => toast.error('Error al despachar: ' + (err.response?.data?.error || err.message)),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IceCream className="h-6 w-6 text-primary" /> Despacho en Vitrina
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Órdenes pagadas en caja pendientes por servir</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1 font-mono">{orders.length} en cola</Badge>
          <Button size="icon" variant="outline" className="h-12 w-12" onClick={() => qc.invalidateQueries({ queryKey: ['sales', 'pending_dispatch'] })}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground">Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h3 className="text-lg font-semibold">Vitrina al día</h3>
          <p className="text-xs text-muted-foreground">No hay órdenes pendientes de despacho.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <DispatchOrderCard key={order.id} order={order} onServe={(o, index) => setSelection({ order: o, index })} />
          ))}
        </div>
      )}

      <ServeFlavorsDialog
        order={selection?.order}
        item={item}
        maxFlavors={maxFlavors}
        trays={trays}
        isPending={dispatch.isPending}
        onConfirm={(ids) => dispatch.mutate(ids)}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}