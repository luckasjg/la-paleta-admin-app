import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Trash2, BaggageClaim } from 'lucide-react';
import moment from 'moment';
import { formatEUR } from '@/lib/useExchangeRate';

/**
 * Lista de pedidos estacionados: reanudar o descartar.
 */
export default function HeldOrdersDialog({ open, onOpenChange, heldOrders, activeSessionId, onResume, onDiscard }) {
  const sorted = [...heldOrders].sort((a, b) => (a.turn || 0) - (b.turn || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BaggageClaim className="h-5 w-5 text-primary" /> Pedidos en espera ({sorted.length})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1">
          {sorted.map(o => {
            const otherSession = o.cash_register_id && o.cash_register_id !== activeSessionId;
            return (
              <Card key={o.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="text-center shrink-0 w-12">
                    <p className="text-2xl font-bold text-primary leading-none">#{o.turn}</p>
                    <p className="text-[10px] text-muted-foreground">turno</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {o.name
                      ? <p className="text-sm font-medium truncate">{o.name}</p>
                      : <p className="text-sm text-muted-foreground italic">Sin nombre</p>}
                    <p className="text-[11px] text-muted-foreground truncate">
                      {(o.cart || []).map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {moment(o.saved_at).fromNow()} · {formatEUR(o.total_snapshot || 0)}
                    </p>
                    {otherSession && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">Armado en otro turno</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" className="h-8" onClick={() => onResume(o)}>
                      <Play className="h-3.5 w-3.5 mr-1" /> Reanudar
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 text-destructive"
                      onClick={() => onDiscard(o)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Descartar
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BaggageClaim className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No hay pedidos en espera</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}