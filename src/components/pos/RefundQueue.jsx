import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import RefundQueueCard from '@/components/pos/RefundQueueCard';
import { cancelRefund } from '@/lib/cancelRefund';

/**
 * Cola de devoluciones por pago móvil / transferencia.
 * Muestra todas las pendientes (incluidas las de turnos anteriores, para que
 * ninguna quede olvidada). Al marcarse pagada sale de la vista pero queda
 * registrada para el reporte de caja.
 */
export default function RefundQueue() {
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['refund_requests', 'pendiente'],
    queryFn: () => base44.entities.RefundRequest.filter({ status: 'pendiente' }, 'created_date'),
  });

  const confirmRefund = useMutation({
    mutationFn: ({ refund, confirmationReference }) =>
      base44.entities.RefundRequest.update(refund.id, {
        status: 'pagada',
        confirmed_at: new Date().toISOString(),
        confirmed_by_id: currentUser?.id,
        confirmed_by_name: currentUser?.full_name || '',
        ...(confirmationReference ? { confirmation_reference: confirmationReference } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refund_requests'] });
      toast.success('Devolución marcada como pagada');
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelRefundMut = useMutation({
    mutationFn: ({ refund, reason }) => cancelRefund(refund, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refund_requests'] });
      toast.success('Devolución cancelada y avisada en #caja');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-lg">No hay devoluciones pendientes</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Cuando un vuelto se registre por pago móvil o transferencia aparecerá aquí y se avisará por Slack en #caja.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="h-4 w-4" />
        {pending.length} {pending.length === 1 ? 'devolución pendiente' : 'devoluciones pendientes'} de envío
      </div>
      {pending.map(r => (
        <RefundQueueCard
          key={r.id}
          refund={r}
          isConfirming={confirmRefund.isPending}
          onConfirm={(refund, confirmationReference) => confirmRefund.mutate({ refund, confirmationReference })}
          isCancelling={cancelRefundMut.isPending}
          onCancel={(refund, reason) => cancelRefundMut.mutate({ refund, reason })}
        />
      ))}
    </div>
  );
}