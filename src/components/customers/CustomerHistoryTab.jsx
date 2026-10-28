import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { formatEUR } from '@/lib/useExchangeRate';
import FavoriteOrderCard from '@/components/customers/FavoriteOrderCard';

export default function CustomerHistoryTab({ customer, data }) {
  const avg = data.entries.length ? data.spent / data.entries.length : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Compras" value={data.entries.length} />
        <Stat label="Total" value={formatEUR(data.spent)} />
        <Stat label="Ticket promedio" value={formatEUR(avg)} />
      </div>
      <FavoriteOrderCard customer={customer} favorite={data.favorite} />
      {data.topFlavors.length > 0 && <div>
        <p className="text-sm font-semibold mb-2">Sabores más pedidos</p>
        <div className="flex flex-wrap gap-2">{data.topFlavors.slice(0, 8).map(f => <Badge key={f.name} variant="secondary">{f.name} · {f.count}</Badge>)}</div>
      </div>}
      <div>
        <p className="text-sm font-semibold mb-2">Compras</p>
        {data.entries.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras asociadas todavía.</p> :
          <div className="space-y-1">{data.entries.map(e => (
            <div key={e.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/60">
              <span>{e.date ? format(new Date(e.date), 'dd/MM/yyyy') : '—'} <span className="text-xs text-muted-foreground ml-1">{e.kind} · {e.items.length} ítems</span></span>
              <span className="font-mono">{formatEUR(e.total || 0)}</span>
            </div>))}</div>}
      </div>
    </div>
  );
}

export const Stat = ({ label, value }) => (
  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div>
);