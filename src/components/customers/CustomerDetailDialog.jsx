import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getCustomerHistory } from '@/lib/customerHistory';
import { formatEUR } from '@/lib/useExchangeRate';
import FavoriteOrderCard from '@/components/customers/FavoriteOrderCard';

export default function CustomerDetailDialog({ customer, onOpenChange }) {
  const { data, isLoading } = useQuery({
    queryKey: ['customer_history', customer?.id],
    enabled: !!customer,
    queryFn: () => getCustomerHistory(customer),
  });

  return (
    <Dialog open={!!customer} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {customer && <>
          <DialogHeader>
            <DialogTitle>{customer.full_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}{customer.address ? ` · ${customer.address}` : ''}</p>
          </DialogHeader>
          {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Cargando historial...</p> : <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Compras registradas</p><p className="text-xl font-bold">{data.entries.length}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total consumido</p><p className="text-xl font-bold">{formatEUR(data.spent)}</p></div>
            </div>
            <FavoriteOrderCard customer={customer} favorite={data.favorite} />
            {data.topFlavors.length > 0 && <div>
              <p className="text-sm font-semibold mb-2">Sabores preferidos</p>
              <div className="flex flex-wrap gap-2">{data.topFlavors.slice(0, 8).map(f => <Badge key={f.name} variant="secondary">{f.name} · {f.count}</Badge>)}</div>
            </div>}
            {data.topCombos.length > 0 && <div>
              <p className="text-sm font-semibold mb-2">Productos más frecuentes</p>
              <div className="space-y-1">{data.topCombos.slice(0, 6).map((c, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-border/60 py-1.5"><span className="truncate">{c.product_name}{c.flavor ? ` — ${c.flavor}` : ''}</span><span className="font-mono shrink-0 ml-2">×{c.count}</span></div>
              ))}</div>
            </div>}
            <div>
              <p className="text-sm font-semibold mb-2">Historial</p>
              {data.entries.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras asociadas todavía.</p> :
                <div className="space-y-1">{data.entries.map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/60">
                    <span>{e.date ? format(new Date(e.date), 'dd/MM/yyyy') : '—'} <span className="text-xs text-muted-foreground ml-1">{e.kind} · {e.items.length} ítems</span></span>
                    <span className="font-mono">{formatEUR(e.total || 0)}</span>
                  </div>))}</div>}
              <p className="text-[11px] text-muted-foreground mt-2">Incluye ventas a crédito y pedidos. Las ventas de contado no quedan asociadas a un cliente.</p>
            </div>
          </div>}
        </>}
      </DialogContent>
    </Dialog>
  );
}