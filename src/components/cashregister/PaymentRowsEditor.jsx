import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { formatUSD } from '@/lib/useExchangeRate';

/** Editor de filas método + monto + moneda. Reutiliza el modelo de pagos del POS. */
export default function PaymentRowsEditor({ rows, methods, rate, onAdd, onRemove, onUpdate }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase text-muted-foreground tracking-wide">Nuevo método de pago</Label>
      {rows.map(r => {
        const amt = parseFloat(r.amount) || 0;
        const usdEq = r.currency === 'USD' ? amt : (rate > 0 ? amt / rate : 0);
        return (
          <div key={r.id} className="space-y-1.5 p-2 border border-border rounded-lg bg-card">
            <div className="flex gap-2">
              <Select value={r.method} onValueChange={v => onUpdate(r.id, { method: v })}>
                <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" /> {m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rows.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => onRemove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={r.amount}
                onChange={e => onUpdate(r.id, { amount: e.target.value })}
                className="flex-1 h-9 font-mono"
              />
              <Select value={r.currency} onValueChange={v => onUpdate(r.id, { currency: v })}>
                <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="VES">VES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {amt > 0 && r.currency === 'VES' && (
              <p className="text-[10px] text-muted-foreground font-mono pl-1">≈ {formatUSD(usdEq)}</p>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={onAdd} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> Agregar método (pago mixto)
      </Button>
    </div>
  );
}