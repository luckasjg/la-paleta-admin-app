import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, HandCoins, CheckCheck } from 'lucide-react';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import InvoiceRow from '@/components/receivables/InvoiceRow';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function CustomerDebtRow({ row: r, dateQuery, canSettle, canReassign, settling, onStatement, onAbono, onSettle, onReassign }) {
  const [open, setOpen] = useState(false);
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['receivables', 'customer_invoices', r.customer_id, dateQuery],
    enabled: open,
    queryFn: async () => (await base44.entities.AccountReceivable.filter(
      { customer_id: r.customer_id, status: 'pendiente', ...(dateQuery ? { sale_date: dateQuery } : {}) },
      { sort: '-sale_date', limit: 100 }
    )).items,
  });

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 min-w-40 flex items-center gap-2 text-left">
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          <div>
            <p className="font-semibold">{r.customer_name}</p>
            <p className="text-xs text-muted-foreground">{r.count} venta(s) pendiente(s)</p>
          </div>
        </button>
        <button type="button" onClick={() => setOpen(o => !o)} className="font-mono font-bold text-lg w-28 text-right">{eur(r.sum_balance_usd)}</button>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onStatement}><FileText className="h-4 w-4" /> Estado</Button>
          <Button size="sm" onClick={onAbono}><HandCoins className="h-4 w-4" /> Abonar</Button>
          {canSettle && (
            <Button size="sm" variant="ghost" disabled={settling} onClick={onSettle}><CheckCheck className="h-4 w-4" /></Button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-2 ml-2 border-l border-border pl-3 divide-y divide-border/60">
          {isLoading && <p className="text-xs text-muted-foreground py-2">Cargando facturas…</p>}
          {invoices.map(inv => (
            <InvoiceRow key={inv.id} receivable={inv} canReassign={canReassign} onAbono={onAbono} onReassign={onReassign} />
          ))}
        </div>
      )}
    </div>
  );
}