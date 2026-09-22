import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pause } from 'lucide-react';

/**
 * Pide (opcionalmente) un nombre para el pedido que se va a dejar en espera.
 * El número de turno se asigna automáticamente y sólo se muestra.
 */
export default function HoldOrderDialog({ open, onOpenChange, nextTurn, totalLabel, onConfirm }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-primary" /> Dejar en espera
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Turno</p>
              <p className="text-3xl font-bold text-primary leading-none">#{nextTurn}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-lg font-semibold">{totalLabel}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="held-name">Nombre o nota (opcional)</Label>
            <Input
              id="held-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Sra. del sombrero / mesa 3"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(name); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onConfirm(name)}>
            <Pause className="h-4 w-4 mr-1" /> Guardar turno #{nextTurn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}