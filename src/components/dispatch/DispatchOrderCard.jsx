import React from 'react';
import moment from 'moment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export default function DispatchOrderCard({ order, onServe }) {
  const waitTime = moment().diff(moment(order.sale_date), 'minutes');
  return (
    <Card className="border-2 border-primary/20 shadow-sm flex flex-col">
      <CardHeader className="pb-2 bg-secondary/30 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold font-mono">
            Ticket #{order.ticket_number || order.id.slice(-4)}
          </CardTitle>
          <Badge variant={waitTime > 5 ? 'destructive' : 'secondary'} className="flex items-center gap-1 font-mono text-sm">
            <Clock className="h-3.5 w-3.5" /> {waitTime} min
          </Badge>
        </div>
        {order.staff_name && <p className="text-xs text-muted-foreground">Cajero: {order.staff_name}</p>}
        {order.customer_name && <p className="text-xs text-muted-foreground">Cliente: {order.customer_name}</p>}
      </CardHeader>
      <CardContent className="pt-3 space-y-2 flex-1">
        {order.items?.map((item, idx) => {
          if (!item.pending_dispatch && !item.flavors?.length) {
            return (
              <p key={idx} className="text-sm text-muted-foreground px-1">{item.quantity}x {item.product_name}</p>
            );
          }
          return (
            <div key={idx} className="p-2.5 rounded-lg border bg-card flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{item.quantity}x {item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.pending_dispatch
                    ? (item.flavor ? `Pidió: ${item.flavor}` : 'Sabores por servir')
                    : `Servido: ${item.flavor}`}
                </p>
              </div>
              {item.pending_dispatch ? (
                <Button onClick={() => onServe(order, idx)} className="h-12 px-5 text-base font-bold shrink-0">
                  Servir
                </Button>
              ) : (
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Servido</Badge>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}