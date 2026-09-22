import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import moment from 'moment';

export default function RefillHistoryDialog({ tray, open, onOpenChange }) {
  const log = [...(tray?.refill_log || [])].reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de rellenos — {tray?.recipe_name}</DialogTitle>
        </DialogHeader>

        {log.length === 0 ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <History className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Esta bandeja aún no tiene rellenos registrados con detalle.
            </p>
            {(tray?.refill_count || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                Fue rellenada ×{tray.refill_count} antes de que el sistema guardara el detalle.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {log.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {r.date ? moment(r.date).format('DD/MM/YYYY') : '—'}
                  </span>
                  <Badge variant="secondary">+{(r.grams_added || 0).toFixed(0)}g</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Restante antes</span>
                  <span className="font-mono text-right">{(r.remaining_before || 0).toFixed(0)}g</span>
                  <span className="text-muted-foreground">Contenido después</span>
                  <span className="font-mono text-right">{(r.remaining_after || 0).toFixed(0)}g</span>
                  <span className="text-muted-foreground">Costo del lote</span>
                  <span className="font-mono text-right">${(r.cost || 0).toFixed(2)}</span>
                  <span className="text-muted-foreground">Costo por gramo</span>
                  <span className="font-mono text-right">${(r.cost_per_gram || 0).toFixed(4)}</span>
                </div>
                {(r.substitutions || []).length > 0 && (
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-xs font-medium text-amber-700">Sustituciones</p>
                    {r.substitutions.map((s, j) => (
                      <p key={j} className="text-xs text-muted-foreground">
                        {s.original_supply_name} → {s.substitute_supply_name} ({(s.quantity || 0).toFixed(1)}{s.unit})
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}