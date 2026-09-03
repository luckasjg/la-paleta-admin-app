import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { formatUSD, formatVES } from '@/lib/useExchangeRate';

/**
 * Panel de vuelto: aparece sólo cuando el cliente pagó de más.
 * El monto se calcula solo; el cajero elige moneda y billetera de salida.
 */
export default function ChangePanel({ excessUSD, exchangeRate, wallets, currency, walletId, onChange }) {
  const activeWallets = wallets.filter(w => w.is_active !== false);
  const selectedWallet = activeWallets.find(w => w.id === walletId);
  const amountNative = currency === 'USD' ? excessUSD : excessUSD * exchangeRate;
  const mismatch = selectedWallet && selectedWallet.currency !== currency;

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs uppercase tracking-wide text-amber-800">Vuelto a entregar</Label>
        <span className="font-mono text-lg font-bold text-amber-900">
          {currency === 'USD' ? formatUSD(amountNative) : formatVES(amountNative)}
        </span>
      </div>

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

      {!walletId && (
        <p className="text-[11px] text-amber-800">Selecciona la billetera para poder confirmar la venta.</p>
      )}
    </div>
  );
}