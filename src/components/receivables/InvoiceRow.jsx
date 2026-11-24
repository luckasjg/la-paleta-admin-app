import React, { useState } from 'react';
import moment from 'moment';
import { ChevronRight, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import InvoiceDetail from '@/components/receivables/InvoiceDetail';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function InvoiceRow({ receivable: r, onAbono, onReassign, canReassign }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 flex items-center gap-2 text-left rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="text-sm flex-1">
            {moment(r.sale_date || r.created_date).format('DD/MM/YY HH:mm')}
            <span className="text-xs text-muted-foreground"> · {r.origin === 'historica' ? 'Histórica' : 'Venta fiada'}{r.paid_usd > 0 ? ` · abonado ${eur(r.paid_usd)}` : ''}</span>
          </span>
          <span className="font-mono text-sm font-semibold">{eur(r.balance_usd)}</span>
          <span className="font-mono text-xs text-muted-foreground w-20 text-right hidden sm:inline">de {eur(r.amount_usd)}</span>
        </button>
        {canReassign && (
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Reasignar cliente" onClick={() => onReassign(r)}>
            <UserCog className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open && (
        <div className="pl-8 pt-1.5">
          <InvoiceDetail receivable={r} canReassign={canReassign} onAbono={() => onAbono(r)} onReassign={() => onReassign(r)} />
        </div>
      )}
    </div>
  );
}