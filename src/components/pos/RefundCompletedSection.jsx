import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import RefundPaidDetails from '@/components/pos/RefundPaidDetails';

/** Devoluciones pagadas hoy — colapsada por defecto. */
export default function RefundCompletedSection({ refunds }) {
  const [open, setOpen] = useState(false);
  if (refunds.length === 0) return null;

  const money = (r) => (r.currency === 'VES'
    ? `Bs. ${(r.amount_native || 0).toFixed(2)}`
    : `$${(r.amount_native || 0).toFixed(2)}`);

  return (
    <div className="space-y-2">
      <Button variant="ghost" onClick={() => setOpen(o => !o)} className="px-2 text-sm">
        {open ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
        Completadas hoy ({refunds.length})
      </Button>
      {open && refunds.map(r => (
        <Card key={r.id} className="border-emerald-200">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-lg font-bold font-mono">{money(r)}</p>
              <p className="text-xs text-muted-foreground">{r.customer_data?.titular || '—'}</p>
            </div>
            <RefundPaidDetails refund={r} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}