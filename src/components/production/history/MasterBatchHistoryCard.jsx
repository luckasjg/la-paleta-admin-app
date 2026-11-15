import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Layers } from 'lucide-react';
import moment from 'moment';
import { formatVET } from '@/lib/vetTime';
import BranchRow from '@/components/production/history/BranchRow';
import { fmtG, fmtUsd, lossLabel, lossCls } from '@/components/production/history/fmt';

export default function MasterBatchHistoryCard({ item }) {
  const [open, setOpen] = useState(true);
  const loss = item.net_loss || 0;
  const pct = item.physical > 0 ? (loss / item.physical) * 100 : 0;
  return (
    <Card className="border-l-4 border-l-violet-400 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <Layers className="h-5 w-5 text-violet-600 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Lote · {item.base_name}</span>
              <Badge className="bg-violet-100 text-violet-700">Lote Maestro</Badge>
              {item.legacy && <Badge variant="outline" className="text-[10px]">Detalle desde bandejas</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.at ? `${formatVET(item.at)} (hora VE)` : item.date && moment(item.date).format('DD/MM/YYYY')}
              {item.multiplier ? ` · ${item.multiplier} bache(s)` : ''} · {item.branches.length} ramal(es)
            </p>
            <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
              <span><span className="text-muted-foreground">Base producida: </span><span className="font-mono font-semibold">{fmtG(item.base_grams)}</span></span>
              <span><span className="text-muted-foreground">Costo lote: </span><span className="font-mono font-semibold">{fmtUsd(item.total_cost)}</span></span>
              <span className={lossCls(loss)}>{lossLabel(loss)} neta: <span className="font-mono font-semibold">{fmtG(Math.abs(loss))} ({Math.abs(pct).toFixed(1)}%)</span></span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-12 divide-y divide-border/60">
          {item.branches.length === 0 && <p className="py-2 text-xs text-muted-foreground">Sin ramales registrados.</p>}
          {item.branches.map((b, i) => <BranchRow key={`${b.tray_id}-${i}`} branch={b} last={i === item.branches.length - 1} />)}
        </div>
      )}
    </Card>
  );
}