import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Boxes } from 'lucide-react';
import moment from 'moment';
import { formatVET } from '@/lib/vetTime';
import { fmtUsd } from '@/components/production/history/fmt';
import { LEFTOVER_DESTINATIONS } from '@/lib/independentBatch';

const g = (n) => (n == null ? '—' : `${Math.round(n).toLocaleString('es')} g`);

export default function IndependentBatchHistoryCard({ item, audit }) {
  const [open, setOpen] = useState(false);
  const loss = item.loss || 0;
  return (
    <Card className="border-l-4 border-l-emerald-400 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <Boxes className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Lote Independiente · {item.recipe_name}{item.multiplier ? ` (x${item.multiplier})` : ''}</span>
              <Badge className="bg-emerald-100 text-emerald-700">Producción Independiente</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.at ? `${formatVET(item.at)} (hora VE)` : item.date && moment(item.date).format('DD/MM/YYYY')}
              {item.operator ? ` · ${item.operator}` : ''}
            </p>
            <p className="text-sm mt-1.5">
              {item.outputs.length} bandeja(s) ({g(item.physical)})
              <span className="text-muted-foreground"> · Sobrante máq: </span>{g(item.leftover)}
              {item.leftover > 0 && <span className="text-[11px] text-muted-foreground"> ({LEFTOVER_DESTINATIONS[item.leftover_destination] || '—'})</span>}
              <span className="text-muted-foreground"> · Merma proc: </span>
              <span className={loss < 0 ? 'text-sky-700' : 'text-amber-700'}>{g(loss)} ({(item.loss_pct || 0).toFixed(1)}%)</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Teórico {g(item.theoretical)} · Costo lote {fmtUsd(item.total_cost)} · {fmtUsd(item.cost_per_gram, 4)}/g
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {audit && <div className="px-4 pb-3 pl-12">{audit}</div>}
      {open && (
        <div className="px-4 pb-3 pl-12 divide-y divide-border/60">
          {item.outputs.map((o, i) => (
            <div key={`${o.tray_id}-${i}`} className="py-2 text-sm space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">Bandeja #{i + 1}</span>
                <Badge className={o.mode === 'relleno' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                  {o.mode === 'relleno' ? 'Relleno de Bandeja' : 'Bandeja Nueva'}
                </Badge>
                {o.mode === 'relleno' && <span className="text-xs text-muted-foreground">{g(o.remaining_before)} → {g(o.remaining_after)}</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 text-xs">
                <span><span className="text-muted-foreground">Neto: </span><span className="font-mono font-semibold">{g(o.net_grams)}</span></span>
                <span><span className="text-muted-foreground">Variegados: </span><span className="font-mono">{g(o.variegatos_grams)}</span></span>
                <span><span className="text-muted-foreground">Costo: </span><span className="font-mono">{fmtUsd(o.cost_total)}</span></span>
                <span><span className="text-muted-foreground">Costo/g: </span><span className="font-mono">{fmtUsd(o.cost_per_gram, 4)}</span></span>
              </div>
              {o.variegatos_used?.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{o.variegatos_used.map(v => `${v.supply_name} ${Number(v.quantity).toFixed(0)}${v.unit}`).join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}