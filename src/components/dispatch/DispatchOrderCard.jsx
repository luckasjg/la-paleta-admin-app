import React from 'react';
import moment from 'moment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import ItemTags from './ItemTags';
import { getUnitFlavors, unitNames } from '@/lib/unitFlavors';
import { getUnitToppings, hasToppings, pendingIn, toppingNames } from '@/lib/toppings';

function ToppingLines({ item }) {
  if (!hasToppings(item)) return null;
  const inc = item.included_toppings_count || 0;
  const units = getUnitToppings(item);
  return (
    <ul className="mt-1 space-y-0.5">
      {units.map((u, i) => {
        const pending = pendingIn(u, inc);
        return (
          <li key={i} className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{units.length > 1 ? `U${i + 1} toppings` : 'Toppings'}</span>
            {' · '}{toppingNames(u) || ''}
            {pending > 0 && <span className="text-amber-700 font-medium">{u.length ? ' · ' : ''}{pending} incluido(s) por elegir</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default function DispatchOrderCard({ order, onServe, onToppings }) {
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
          if (!item.pending_dispatch && !item.flavors?.length && !hasToppings(item)) {
            return (
              <div key={idx} className="px-1">
                <p className="text-sm text-muted-foreground">{item.quantity}x {item.product_name}</p>
                <ItemTags item={item} />
              </div>
            );
          }
          const isFlavorItem = item.pending_dispatch || item.flavors?.length > 0;
          const done = !item.pending_dispatch && !item.pending_toppings;
          return (
            <div key={idx} className="p-2.5 rounded-lg border bg-card flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{item.quantity}x {item.product_name}</p>
                <ItemTags item={item} />
                {isFlavorItem && (item.pending_dispatch && item.quantity > 1 ? (
                  <ul className="mt-1 space-y-0.5">
                    {getUnitFlavors(item).map((u, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{item.product_name} ({i + 1}/{item.quantity})</span>
                        {' · '}{unitNames(u) || 'por servir'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {item.pending_dispatch
                      ? (item.flavor ? `Pidió: ${item.flavor}` : 'Sabores por servir')
                      : `Servido: ${item.flavor}`}
                  </p>
                ))}
                <ToppingLines item={item} />
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {item.pending_dispatch && (
                  <Button onClick={() => onServe(order, idx)} className="h-12 px-5 text-base font-bold">Servir</Button>
                )}
                {item.pending_toppings && (
                  <Button variant={item.pending_dispatch ? 'outline' : 'default'} onClick={() => onToppings(order, idx)} className="h-12 px-5 text-base font-bold">Toppings</Button>
                )}
                {done && <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">Servido</Badge>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}