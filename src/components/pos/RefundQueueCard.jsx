import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Smartphone, Landmark, Copy } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import CancelRefundButton from '@/components/pos/CancelRefundButton';

const methodLabel = (m) => (m === 'transferencia' ? 'Transferencia' : 'Pago Móvil');
const accountLabel = (t) =>
  t === 'ahorro' ? 'Ahorro' : t === 'corriente' ? 'Corriente' : t === 'pago_movil' ? 'Pago Móvil' : '—';

const Row = ({ label, value, copyable }) => (
  <div className="flex items-baseline justify-between gap-2 py-1 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-medium text-right break-all flex items-center gap-1.5">
      {value || '—'}
      {copyable && value && (
        <button
          onClick={() => { navigator.clipboard.writeText(String(value)); toast.success('Copiado'); }}
          className="p-1 -m-1 text-muted-foreground hover:text-foreground"
          aria-label={`Copiar ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  </div>
);

export default function RefundQueueCard({ refund, onConfirm, isConfirming, onCancel, isCancelling }) {
  const [ref, setRef] = useState('');
  const c = refund.customer_data || {};
  const Icon = refund.method === 'transferencia' ? Landmark : Smartphone;
  const money = refund.currency === 'VES'
    ? `Bs. ${(refund.amount_native || 0).toFixed(2)}`
    : `$${(refund.amount_native || 0).toFixed(2)}`;

  return (
    <Card className="border-amber-300">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant="outline" className="gap-1">
                <Icon className="h-3 w-3" /> {methodLabel(refund.method)}
              </Badge>
              {refund.operation_code && (
                <Badge className="bg-slate-900 text-white font-mono">
                  COD OP {refund.operation_code}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-amber-900 font-mono leading-tight">{money}</p>
            <p className="text-xs text-muted-foreground">≈ ${(refund.amount_usd_equivalent || 0).toFixed(2)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{moment(refund.created_date).format('DD/MM HH:mm')}</p>
            <p>{refund.staff_name || '—'}</p>
          </div>
        </div>

        <div>
          <Row label="Titular" value={c.titular} />
          <Row label="Cédula" value={c.cedula} copyable />
          <Row label="Banco" value={c.banco} />
          <Row label="Tipo de cuenta" value={accountLabel(c.tipo_cuenta)} />
          <Row label="N° de cuenta" value={c.numero_cuenta} copyable />
          <Row label="Teléfono" value={c.telefono} copyable />
          <Row label="Sale de" value={refund.wallet_name} />
          <Row label="Motivo" value={refund.reference} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="N° de operación (opcional)"
            className="flex-1 h-11 px-3 rounded-md border border-input bg-background text-sm font-mono"
          />
          <Button
            onClick={() => onConfirm(refund, ref)}
            disabled={isConfirming}
            className="h-11 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Marcar pagada
          </Button>
          <CancelRefundButton refund={refund} onCancel={onCancel} isCancelling={isCancelling} />
        </div>
      </CardContent>
    </Card>
  );
}