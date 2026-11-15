import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { formatVET } from '@/lib/vetTime';
import { fmtG } from '@/components/production/history/fmt';

const MODE = {
  nueva: { label: 'Bandeja Nueva', cls: 'bg-green-100 text-green-700' },
  relleno: { label: 'Relleno de Bandeja', cls: 'bg-blue-100 text-blue-700' },
  transferencia: { label: 'Unión', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function SingleProductionCard({ item }) {
  const e = item.event;
  const mode = MODE[e.type] || MODE.nueva;
  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        {e.type !== 'transferencia' && <Badge variant="outline">Producción Independiente</Badge>}
        <Badge className={mode.cls}>{mode.label}</Badge>
        <span className="font-medium truncate">
          {e.type === 'transferencia' ? `${e.source_recipe_name} → ${e.recipe_name}` : e.recipe_name}
        </span>
      </div>
      <span className="font-mono font-semibold">{fmtG(e.grams)}</span>
      {e.remaining_after != null && <span className="text-xs text-muted-foreground">quedó {fmtG(e.remaining_after)}</span>}
      <span className="text-xs text-muted-foreground">
        {item.at ? `${formatVET(item.at)} (hora VE)` : moment(e.date).format('DD/MM/YYYY')}
        {e.operator ? ` · ${e.operator}` : ''}
      </span>
    </Card>
  );
}