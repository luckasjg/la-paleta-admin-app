import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import moment from 'moment';

/**
 * Lista las devoluciones YA PAGADAS de la venta que se está anulando, para que
 * el admin decida cuáles reversar (dinero que en realidad no se envió).
 * Por defecto todas quedan DESMARCADAS: se asume que el dinero sí salió.
 */
export default function PaidRefundsReversalList({ refunds, selectedIds, onToggle }) {
  if (!refunds || refunds.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
      <p className="text-xs text-amber-900 flex items-start gap-1.5 leading-tight">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Esta venta tiene devoluciones marcadas como <strong>pagadas</strong>. Marca sólo las que
        NO se enviaron realmente al cliente para devolver ese dinero a la billetera.
      </p>
      {refunds.map(r => (
        <label
          key={r.id}
          htmlFor={`refund-${r.id}`}
          className="flex items-start gap-2 rounded-md bg-white p-2 cursor-pointer"
        >
          <Checkbox
            id={`refund-${r.id}`}
            checked={selectedIds.includes(r.id)}
            onCheckedChange={() => onToggle(r.id)}
            className="mt-0.5"
          />
          <div className="text-xs leading-tight">
            <span className="font-semibold font-mono">
              {r.currency === 'USD' ? '$' : 'Bs. '}{(r.amount_native || 0).toFixed(2)}
            </span>
            <span className="text-muted-foreground">
              {' '}· {r.method === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'}
              {r.wallet_name ? ` · ${r.wallet_name}` : ''}
            </span>
            <div className="text-muted-foreground">
              Confirmada {r.confirmed_at ? moment(r.confirmed_at).format('DD/MM/YY HH:mm') : '—'}
              {r.confirmation_reference ? ` · Ref. ${r.confirmation_reference}` : ''}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}