import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pencil, ArrowDown, Ban } from 'lucide-react';
import moment from 'moment';

const LEVELS = [
  { min: 40, dot: 'bg-emerald-500', bar: 'bg-emerald-500', label: 'Stock óptimo', text: 'text-emerald-700' },
  { min: 20, dot: 'bg-amber-500', bar: 'bg-amber-500', label: 'Preparar recambio', text: 'text-amber-700' },
  { min: -1, dot: 'bg-rose-500', bar: 'bg-rose-500', label: 'Crítico — casi agotada', text: 'text-rose-700' },
];

export default function VitrineTrayCard({ tray, onEdit, onExhaust, onDemote, busy }) {
  const pct = tray.initial_grams ? Math.max(0, (tray.remaining_grams / tray.initial_grams) * 100) : 0;
  const level = LEVELS.find(l => pct > l.min) || LEVELS[LEVELS.length - 1];

  return (
    <Card className="border-2 border-primary/40 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-3 w-3 rounded-full flex-shrink-0 ${level.dot}`} />
            <CardTitle className="text-base truncate">{tray.recipe_name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onEdit(tray)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className={`text-xs font-medium ${level.text}`}>{level.label}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Restante</span>
          <span className="font-mono font-semibold">{tray.remaining_grams?.toFixed(0)}g / {tray.initial_grams}g</span>
        </div>
        <Progress value={pct} className="h-2.5" indicatorClassName={level.bar} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{tray.production_date && moment(tray.production_date).format('DD/MM/YY')}</span>
          {(tray.refill_count || 0) > 0 && <Badge className="bg-blue-100 text-blue-700">Rellenada ×{tray.refill_count}</Badge>}
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 h-11"
            variant="destructive"
            disabled={busy}
            onClick={() => onExhaust(tray)}
          >
            <Ban className="h-4 w-4 mr-1.5" /> Se agotó
          </Button>
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => onDemote(tray)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}