import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ORDER_STATUSES } from '@/lib/orderStatus';
import OrderCard from '@/components/orders/OrderCard';

const ACTIVE = ['pendiente', 'confirmado', 'en_preparacion', 'listo'];

export default function Orders() {
  const [filter, setFilter] = useState('activos');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const filtered = orders.filter((o) =>
    filter === 'activos' ? ACTIVE.includes(o.status || 'pendiente') :
    filter === 'todos' ? true : o.status === filter
  );

  const tabs = [
    { value: 'activos', label: 'Activos' },
    ...ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    { value: 'todos', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Pedidos recibidos desde el menú móvil por WhatsApp"
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={filter === t.value ? 'default' : 'outline'}
            onClick={() => setFilter(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando pedidos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">No hay pedidos en esta vista.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              isUpdating={updateStatus.isPending}
              onAdvance={(order, status) => updateStatus.mutate({ id: order.id, status })}
              onCancel={(order) => updateStatus.mutate({ id: order.id, status: 'cancelado' })}
            />
          ))}
        </div>
      )}
    </div>
  );
}