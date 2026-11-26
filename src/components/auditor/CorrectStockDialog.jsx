import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LOCATION_LABEL } from '@/lib/stockHelpers';
import { fmtQty } from '@/lib/inventoryAudit';

export default function CorrectStockDialog({ finding: f, open, onOpenChange, onSubmit, pending }) {
  const [location, setLocation] = useState('warehouse');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && f) {
      setLocation((f.stock_production || 0) > (f.stock_warehouse || 0) ? 'production' : 'warehouse');
      setValue(''); setReason('');
    }
  }, [open, f]);

  if (!f) return null;
  const current = location === 'production' ? f.stock_production || 0 : f.stock_warehouse || 0;
  const num = parseFloat(value);
  const valid = Number.isFinite(num) && num >= 0 && reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Ajustar stock físico</DialogTitle></DialogHeader>
        <p className="text-sm font-medium">{f.name}</p>
        <div className="grid grid-cols-2 gap-2">
          {['warehouse', 'production'].map(l => (
            <button key={l} type="button" onClick={() => setLocation(l)}
              className={`rounded-lg border p-2.5 text-left transition-colors ${location === l ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{LOCATION_LABEL[l]}</p>
              <p className="font-mono text-sm font-semibold">{fmtQty(l === 'production' ? f.stock_production : f.stock_warehouse)} {f.unit}</p>
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cantidad física contada ({f.unit})</Label>
          <Input type="number" min="0" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder={fmtQty(current)} autoFocus />
          {Number.isFinite(num) && num >= 0 && (
            <p className="text-xs text-muted-foreground">Cambio: <span className="font-mono">{num - current >= 0 ? '+' : ''}{fmtQty(num - current)} {f.unit}</span></p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Motivo</Label>
          <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Conteo físico tras revisión del Auditor" maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit({ supply_id: f.supply_id, location, value: num, reason, finding_key: f.key })}>
            {pending ? 'Guardando...' : 'Registrar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}