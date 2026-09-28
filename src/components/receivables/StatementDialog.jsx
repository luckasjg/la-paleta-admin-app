import React from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function StatementDialog({ customer, open, onOpenChange }) {
  const id = customer?.customer_id;
  const { data, isLoading } = useQuery({
    queryKey: ['receivables', 'statement', id],
    enabled: !!id && open,
    queryFn: async () => {
      const [rec, pay] = await Promise.all([
        base44.entities.AccountReceivable.filter({ customer_id: id }, { sort: '-sale_date', limit: 200 }),
        base44.entities.ReceivablePayment.filter({ customer_id: id }, { sort: '-payment_date', limit: 200 }),
      ]);
      return [
        ...rec.items.map(r => ({ id: r.id, date: r.sale_date || r.created_date, kind: 'venta', usd: r.amount_usd, r })),
        ...pay.items.map(p => ({ id: p.id, date: p.payment_date || p.created_date, kind: 'abono', usd: p.amount_usd_equivalent, p })),
      ].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Estado de cuenta · {customer?.customer_name}</DialogTitle></DialogHeader>
        <div className="flex justify-between rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm">
          <span className="text-muted-foreground">Saldo pendiente</span>
          <span className="font-mono font-bold text-primary">{eur(customer?.sum_balance_usd)}</span>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p> : (
          <div className="divide-y divide-border">
            {(data || []).map(m => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{m.kind === 'venta' ? 'Venta fiada' : `Abono · ${m.p.method.replace(/_/g, ' ')}`}</p>
                  <p className="text-xs text-muted-foreground">{moment(m.date).format('DD/MM/YY HH:mm')} · {(m.r || m.p).staff_name || '—'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-semibold ${m.kind === 'abono' ? 'text-emerald-600' : ''}`}>{m.kind === 'abono' ? '−' : '+'}{eur(m.usd)}</p>
                  {m.kind === 'venta' && <Badge variant="secondary" className="text-[10px]">{m.r.status === 'saldada' ? 'Saldada' : `Resta ${eur(m.r.balance_usd)}`}</Badge>}
                </div>
              </div>
            ))}
            {data?.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sin movimientos</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}