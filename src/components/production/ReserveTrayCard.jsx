import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ArrowUp } from 'lucide-react';
import moment from 'moment';

export default function ReserveTrayCard({ tray, onEdit, onDelete, onPromote, busy }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{tray.recipe_name}</span>
        <div className="flex items-center flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tray)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(tray.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">{tray.remaining_grams?.toFixed(0)}g / {tray.initial_grams}g</span>
        <span>{tray.production_date && moment(tray.production_date).format('DD/MM/YY')}</span>
      </div>
      {(tray.refill_count || 0) > 0 && (
        <Badge className="bg-blue-100 text-blue-700">Rellenada ×{tray.refill_count}</Badge>
      )}
      <Button variant="outline" className="w-full h-10" disabled={busy} onClick={() => onPromote(tray)}>
        <ArrowUp className="h-4 w-4 mr-1.5" /> Subir a vitrina
      </Button>
    </Card>
  );
}