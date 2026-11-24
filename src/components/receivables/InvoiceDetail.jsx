import React from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { HandCoins, UserCog, History } from 'lucide-react';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import SaleItemsList from '@/components/receivables/SaleItemsList';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function InvoiceDetail({ receivable: r, onAbono, onReassign, canReassign }) {
  const { data, isLoading } = useQuery({
    queryKey: ['receivables', 'invoice_detail', r.id, r.customer_id],
    queryFn: async () => {
      const [sale, pays] = await Promise.all([
        r.sale_id ? base44.entities.Sale.get(r.sale_id).catch(() => null) : null,
        base44.entities.ReceivablePayment.filter({ customer_id: r.customer_id }, { sort: '-payment_date', limit: 200 }),
      ]);
      const payments = pays.items
        .map(p => ({ ...p, applied: (p.allocations || []).find(a => a.receivable_id === r.id)?.amount_usd }))
        .filter(p => p.applied > 0);
      return { sale, payments };
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground py-3">Cargando detalle…</p>;
  const sale = data?.sale;
  const subtotal = sale ? (sale.items || []).reduce((s, i) => s + (i.subtotal_before_promo ?? i.subtotal ?? 0), 0) : r.amount_usd;
  const history = r.reassignment_history || [];

  return (
    <div className="space-y-3 rounded-lg bg-muted/40 border border-border p-3">
      {history.map((h, i) => (
        <p key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <History className="h-3 w-3" /> Reasignada desde: {h.from_customer_name}{h.from_customer_cedula ? ` (${h.from_customer_cedula})` : ''} · {moment(h.reassigned_at).format('DD/MM/YYYY')}{h.reason ? ` · ${h.reason}` : ''}
        </p>
      ))}

      {sale ? <SaleItemsList items={sale.items} /> : <p className="text-xs text-muted-foreground">{r.origin === 'historica' ? 'Deuda histórica cargada manualmente (sin venta asociada).' : 'Venta no disponible.'}</p>}

      <div className="border-t border-border pt-2 space-y-1 text-sm font-mono">
        <div className="flex justify-between text-muted-foreground"><span className="font-sans">Subtotal</span><span>{eur(subtotal)}</span></div>
        {sale?.discount_amount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span className="font-sans">Promociones {(sale.applied_promotions || []).map(p => p.name).join(', ')}</span><span>−{eur(sale.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold"><span className="font-sans">Total factura</span><span>{eur(r.amount_usd)}</span></div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Abonos</p>
        {data.payments.length === 0 && <p className="text-xs text-muted-foreground">Sin abonos aplicados</p>}
        {data.payments.map(p => (
          <div key={p.id} className="flex justify-between text-xs">
            <span>{moment(p.payment_date || p.created_date).format('DD/MM/YY HH:mm')} · {(p.method || '').replace(/_/g, ' ')}</span>
            <span className="font-mono text-emerald-600">−{eur(p.applied)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-semibold pt-1">
          <span>Saldo pendiente</span><span className="font-mono text-primary">{eur(r.balance_usd)}</span>
        </div>
      </div>

      {r.status === 'pendiente' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onAbono}><HandCoins className="h-4 w-4" /> Registrar abono</Button>
          {canReassign && <Button size="sm" variant="outline" onClick={onReassign}><UserCog className="h-4 w-4" /> Reasignar cliente</Button>}
        </div>
      )}
    </div>
  );
}