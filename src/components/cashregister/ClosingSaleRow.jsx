import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import moment from 'moment';
import { isCreditSale } from '@/lib/creditSales';

const fmt = (n) => `$${(n || 0).toFixed(2)}`;

export default function ClosingSaleRow({ sale: s, labels }) {
  const [open, setOpen] = useState(false);
  const voided = s.status === 'voided';
  return (
    <div className={`border rounded-lg ${voided ? 'opacity-60' : ''}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/40 transition-colors">
        <span className="font-mono text-sm w-12 shrink-0">{moment(s.sale_date).format('HH:mm')}</span>
        <span className="flex-1 min-w-0 text-sm truncate">{s.customer_name || 'Sin cliente'}</span>
        {voided && <Badge variant="destructive" className="text-xs">Anulada</Badge>}
        {isCreditSale(s) && <Badge className="text-xs bg-yellow-100 text-yellow-700">Crédito</Badge>}
        <span className="font-mono font-semibold text-sm">{fmt(s.total)}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-sm border-t pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Fecha: </span>{moment(s.sale_date).format('DD/MM/YYYY HH:mm')}</div>
            <div><span className="text-muted-foreground">Cajero: </span>{s.staff_name || '—'}</div>
            <div><span className="text-muted-foreground">Cliente: </span>{s.customer_name ? `${s.customer_name}${s.customer_cedula ? ` · V-${s.customer_cedula}` : ''}` : '—'}</div>
            <div><span className="text-muted-foreground">Estado: </span>{voided ? `Anulada${s.void_reason ? ` (${s.void_reason})` : ''}` : 'Completada'}</div>
            {s.benefit_staff_name && <div className="col-span-2"><span className="text-muted-foreground">Colaborador: </span>{s.benefit_staff_name}</div>}
          </div>
          <div className="space-y-1">
            {(s.items || []).map((i, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span className="min-w-0">{i.quantity}x {i.product_name}{i.flavor ? <span className="text-muted-foreground"> · {i.flavor}</span> : null}{i.is_courtesy ? <span className="text-amber-600"> · cortesía</span> : null}</span>
                <span className="font-mono">{fmt(i.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(s.payments || []).length === 0
              ? <Badge variant="secondary" className="text-xs">{labels[s.payment_method] || s.payment_method || '—'}</Badge>
              : s.payments.map((p, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{labels[p.method] || p.method}: {fmt(p.amount_usd_equivalent)}</Badge>
              ))}
            {s.change_amount_usd_equivalent > 0 && <Badge variant="outline" className="text-xs">Vuelto: {fmt(s.change_amount_usd_equivalent)}</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}