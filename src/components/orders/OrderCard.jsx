import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MapPin, Clock, Check, X, CreditCard } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';
import { statusMeta, NEXT_STATUS, CHANNEL_LABELS } from '@/lib/orderStatus';
import OrderItemsList from '@/components/orders/OrderItemsList';

export default function OrderCard({ order, onAdvance, onCancel, onCharge, isUpdating }) {
  const meta = statusMeta(order.status);
  const next = NEXT_STATUS[order.status];
  const isClosed = order.status === 'despachado' || order.status === 'cancelado';

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-bold">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{CHANNEL_LABELS[order.channel] || order.channel}</Badge>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${meta.className}`}>{meta.label}</span>
            {order.linked_sale_id && (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">Cobrado</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{order.customer_phone}</span>
          {order.customer_address && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{order.customer_address}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(order.created_date).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>

        <OrderItemsList items={order.items} />

        {order.notes && (
          <p className="text-xs bg-muted rounded p-2 italic">{order.notes}</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-lg font-black font-mono">{formatUSD(order.total)}</span>
          {!isClosed && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={isUpdating} onClick={() => onCancel(order)}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
              {!order.linked_sale_id && (
                <Button variant="secondary" size="sm" onClick={() => onCharge(order)}>
                  <CreditCard className="h-4 w-4" /> Cobrar en POS
                </Button>
              )}
              {next && (
                <Button size="sm" disabled={isUpdating} onClick={() => onAdvance(order, next)}>
                  <Check className="h-4 w-4" /> {statusMeta(next).label}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}