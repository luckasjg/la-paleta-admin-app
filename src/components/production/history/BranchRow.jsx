import React from 'react';
import { Badge } from '@/components/ui/badge';
import { fmtG, fmtUsd, lossLabel, lossCls } from '@/components/production/history/fmt';

export default function BranchRow({ branch, last }) {
  const isRefill = branch.mode === 'relleno';
  const loss = branch.loss_grams;
  return (
    <div className="flex gap-2 py-2 text-sm">
      <span className="font-mono text-muted-foreground/60 select-none">{last ? '└──' : '├──'}</span>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{branch.recipe_name}</span>
          <Badge className={isRefill ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
            {isRefill ? 'Relleno de Bandeja' : 'Bandeja Nueva'}
          </Badge>
          {isRefill && branch.remaining_before != null && (
            <span className="text-xs text-muted-foreground">{fmtG(branch.remaining_before)} → {fmtG(branch.remaining_after)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-0.5 text-xs">
          <span><span className="text-muted-foreground">Base: </span><span className="font-mono">{fmtG(branch.base_grams)}</span></span>
          <span><span className="text-muted-foreground">Variegados: </span><span className="font-mono">{fmtG(branch.variegatos_grams)}</span></span>
          <span><span className="text-muted-foreground">Neto: </span><span className="font-mono font-semibold">{fmtG(branch.net_grams)}</span></span>
          <span className={loss == null ? '' : lossCls(loss)}>
            {loss == null ? <span className="text-muted-foreground">Merma: —</span> : <>{lossLabel(loss)}: <span className="font-mono">{fmtG(Math.abs(loss))}</span></>}
          </span>
          <span><span className="text-muted-foreground">Costo/g: </span><span className="font-mono">{fmtUsd(branch.cost_per_gram, 4)}</span></span>
        </div>
      </div>
    </div>
  );
}