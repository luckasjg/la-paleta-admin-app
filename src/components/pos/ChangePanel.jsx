import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Banknote, Smartphone, Landmark } from 'lucide-react';
import { formatUSD, formatVES } from '@/lib/useExchangeRate';
import RefundCustomerFields from '@/components/pos/RefundCustomerFields';

const METHODS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'pago_movil', label: 'Pago Móvil', icon: Smartphone },
  { value: 'transferencia', label: 'Transferencia', icon: Landmark },
];

/**
 * Panel de vuelto: aparece sólo cuando el cliente pagó de más.
 * El monto se calcula solo; el cajero elige el método de entrega, la moneda
 * y la billetera de salida. Si el método es pago móvil o transferencia se
 * capturan los datos bancarios del cliente para procesar la devolución.
 */
export default function ChangePanel({
  excessUSD, exchangeRate, wallets,
  currency, walletId, method, customerData, reference,
  onChange,
}) {
  const activeWallets = wallets.filter(w => w.is_active !== false);
  const selectedWallet = activeWallets.find(w => w.id === walletId);
  const amountNative = currency === 'USD' ? excessUSD : excessUSD * exchangeRate;
  const mismatch = selectedWallet && selectedWallet.currency !== currency;
  const isDigital = method === 'pago_movil' || method === 'transferencia';

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs uppercase tracking-wide text-amber-800">Vuelto a entregar</Label>
        <span className="font-mono text-lg font-bold text-amber-900">
          {currency === 'USD' ? formatUSD(amountNative) : formatVES(amountNative)}
        </span>
      </div>

      {/* Método de entrega del vuelto */}
      <Select value={method} onValueChange={v => onChange({ method: v })}>
        <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {METHODS.map(m => (
            <SelectItem key={m.value} value={m.value}>
              <span className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" /> {m.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Select value={currency} onValueChange={v => onChange({ currency: v })}>
          <SelectTrigger className="w-24 h-9 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="VES">VES</SelectItem>
          </SelectContent>
        </Select>
        <Select value={walletId || ''} onValueChange={v => onChange({ walletId: v })}>
          <SelectTrigger className="flex-1 h-9 bg-white text-sm">
            <SelectValue placeholder="¿De qué billetera sale?" />
          </SelectTrigger>
          <SelectContent>
            {activeWallets.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {w.name} <span className="text-muted-foreground">({w.currency})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currency === 'VES' && (
        <p className="text-[10px] text-amber-800 font-mono">
          {formatUSD(excessUSD)} × Bs. {exchangeRate.toFixed(2)} = {formatVES(amountNative)}
        </p>
      )}

      {mismatch && (
        <p className="text-[11px] text-destructive flex items-start gap-1 leading-tight">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
          La billetera está en {selectedWallet.currency} y el vuelto en {currency}. Se descontará el equivalente.
        </p>
      )}

      {isDigital && (
        <div className="border-t border-amber-200 pt-2">
          <p className="text-[11px] text-amber-800 mb-1">
            Se enviará una notificación a Slack (#caja) con estos datos y quedará en la cola de devoluciones.
          </p>
          <RefundCustomerFields
            data={customerData || {}}
            method={method}
            reference={reference}
            onChange={d => onChange({ customerData: d })}
            onReferenceChange={r => onChange({ reference: r })}
          />
        </div>
      )}

      {!walletId && (
        <p className="text-[11px] text-amber-800">Selecciona la billetera para poder confirmar la venta.</p>
      )}
    </div>
  );
}