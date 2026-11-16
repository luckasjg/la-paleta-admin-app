import React from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { formatEUR, formatVES, EUR_PER_USD } from '@/lib/useExchangeRate';
import { chargeLabel } from '@/lib/premiumCharge';

export default function PremiumChargeCard({ charge, eurVes, onPay, onSkip }) {
  const eur = (charge.amount_usd || 0) * EUR_PER_USD;
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 animate-in fade-in slide-in-from-top-2">
      <div className="h-10 w-10 rounded-full bg-amber-400/90 text-amber-950 flex items-center justify-center shrink-0">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-amber-950 leading-tight truncate">{chargeLabel(charge)}</p>
        <p className="text-xs text-amber-800 truncate">
          {charge.customer_name && charge.ticket_number ? `Ticket #${charge.ticket_number} · ` : ''}
          {charge.product_name} · {charge.flavors_detail || 'sabor premium'}
        </p>
        <p className="text-[10px] text-amber-700">Despachado {moment(charge.created_date).fromNow()}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-amber-950">{formatEUR(eur)}</p>
        <p className="text-[10px] font-mono text-amber-700">{formatVES(eur * eurVes)}</p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <Button size="sm" className="h-8" onClick={() => onPay(charge)}>Cobrar</Button>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] text-amber-800" onClick={() => onSkip(charge)}>Omitir</Button>
      </div>
    </div>
  );
}