import React from 'react';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Abonos de cuentas por cobrar recibidos en el turno. */
export default function AbonosSessionCard({ abonos = [] }) {
  if (abonos.length === 0) return null;
  const total = abonos.reduce((s, a) => s + (a.amount_usd_equivalent || 0), 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Abonos de clientes <span className="text-muted-foreground font-normal">· total ${total.toFixed(2)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {abonos.map(a => (
          <div key={a.id} className="px-6 py-2.5 flex justify-between text-sm">
            <span>{moment(a.payment_date).format('HH:mm')} · {a.customer_name} · <span className="capitalize text-muted-foreground">{(a.method || '').replace(/_/g, ' ')}</span></span>
            <span className="font-mono font-semibold">${(a.amount_usd_equivalent || 0).toFixed(2)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}