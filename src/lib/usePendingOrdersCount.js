import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Cantidad de pedidos aún sin atender (estado "pendiente").
export function usePendingOrdersCount() {
  const { data = 0 } = useQuery({
    queryKey: ['pending_orders_count'],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ status: 'pendiente' });
      return Array.isArray(orders) ? orders.length : 0;
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
  return data;
}