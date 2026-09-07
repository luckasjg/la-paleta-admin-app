import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import moment from 'moment';

/** Resumen del pago confirmado (desde Slack o desde el POS). */
export default function RefundPaidDetails({ refund }) {
  return (
    <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 space-y-1">
      <Badge className="bg-emerald-600 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" /> Pagada
      </Badge>
      <p className="text-sm font-mono">Ref: {refund.confirmation_reference || '—'}</p>
      <p className="text-sm font-mono">Cód: {refund.operation_code || '—'}</p>
      <p className="text-xs text-muted-foreground">
        Confirmado por {refund.confirmed_by_name || '—'}
        {refund.confirmed_at ? ` · ${moment(refund.confirmed_at).format('DD/MM HH:mm')}` : ''}
      </p>
    </div>
  );
}