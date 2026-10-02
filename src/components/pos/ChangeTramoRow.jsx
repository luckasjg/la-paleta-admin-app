import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Smartphone, Landmark, Trash2 } from 'lucide-react';
import RefundCustomerFields from '@/components/pos/RefundCustomerFields';

const METHODS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
  { value: 'transferencia', label: 'Transferencia', icon: Landmark },
];

/** Un tramo del vuelto: método, moneda, billetera de salida y monto. */
export default function ChangeTramoRow({ tramo, index, wallets, canRemove, onChange, onRemove }) {
  const isDigital = tramo.method === 'pago_movil' || tramo.method === 'transferencia';
  return (
    <div className="rounded-lg bg-white/80 border border-amber-200 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 w-12">Tramo {index + 1}</span>
        <Select value={tramo.method} onValueChange={v => onChange({ method: v })}>
          <SelectTrigger className="flex-1 h-8 bg-white text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {METHODS.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" /> {m.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="number" step="0.01" min="0" placeholder="0.00"
          value={tramo.amount}
          onChange={e => onChange({ amount: e.target.value })}
          className="flex-1 h-8 font-mono bg-white"
        />
        <Select value={tramo.currency} onValueChange={v => onChange({ currency: v })}>
          <SelectTrigger className="w-20 h-8 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="VES">VES</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Select value={tramo.walletId || ''} onValueChange={v => onChange({ walletId: v })}>
        <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="¿De qué billetera sale?" /></SelectTrigger>
        <SelectContent>
          {wallets.map(w => (
            <SelectItem key={w.id} value={w.id}>
              {w.name} <span className="text-muted-foreground">({w.currency})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isDigital && (
        <RefundCustomerFields
          data={tramo.customerData || {}}
          method={tramo.method}
          reference={tramo.reference}
          onChange={d => onChange({ customerData: d })}
          onReferenceChange={r => onChange({ reference: r })}
        />
      )}
    </div>
  );
}