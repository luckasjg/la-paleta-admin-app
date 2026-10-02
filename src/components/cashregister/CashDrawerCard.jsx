import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
import CashDrawerDetailDialog from '@/components/cashregister/CashDrawerDetailDialog';
import { fmtUsd, fmtBs } from '@/lib/cashCurrencyBreakdown';

export default function CashDrawerCard({ movements, summary }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground font-medium">Fondo de caja</p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
          <List className="h-3.5 w-3.5" /> Detalle
        </Button>
      </div>
      <p className="text-2xl font-bold mt-1">${summary.expected.toFixed(2)}</p>
      {summary.breakdown ? (
        <p className="text-xs text-muted-foreground mt-1 font-mono">{fmtUsd(summary.breakdown.cashUsd)} · {fmtBs(summary.breakdown.cashVes)}</p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">Efectivo físico esperado</p>
      )}
      <CashDrawerDetailDialog open={open} onOpenChange={setOpen} movements={movements} summary={summary} />
    </Card>
  );
}