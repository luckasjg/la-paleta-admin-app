import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { formatUSD, formatVES } from '@/lib/useExchangeRate';
import { usePaymentMethods } from '@/lib/usePaymentMethods';
import { useCurrencySymbol } from '@/lib/useCurrencySymbol';
import ChangePanel from '@/components/pos/ChangePanel';

const makeRow = (methods, method, amount = '') => {
  const fallback = methods[0] || { value: 'efectivo_usd', defaultCurrency: 'USD' };
  const m = methods.find(x => x.value === method) || fallback;
  return {
    id: Math.random().toString(36).slice(2),
    method: m.value,
    currency: m.defaultCurrency,
    amount: amount === '' ? '' : String(amount),
  };
};

// Formats a number for prefilling the amount input (in the row's currency)
const prefillAmount = (usdAmount, currency, rate) => {
  if (usdAmount <= 0) return '';
  const val = currency === 'USD' ? usdAmount : usdAmount * rate;
  return val.toFixed(2);
};

export default function MixedPaymentDialog({ open, onOpenChange, totalUSD, exchangeRate, wallets = [], onConfirm, isProcessing }) {
  // Métodos dinámicos desde la entidad PaymentMethod (sólo activos).
  const { posMethods } = usePaymentMethods({ activeOnly: true });
  const { symbol } = useCurrencySymbol();
  const PAYMENT_METHODS = posMethods.length > 0 ? posMethods : [
    { value: 'efectivo_usd', label: 'Efectivo', defaultCurrency: 'USD' },
  ];
  const getMethod = (v) => PAYMENT_METHODS.find(m => m.value === v) || PAYMENT_METHODS[0];

  // Lock the exchange rate at the moment the dialog opens so prefills and conversions
  // stay consistent even if the user edits the rate elsewhere mid-checkout.
  const [lockedRate, setLockedRate] = useState(exchangeRate);

  const defaultMethodValue = PAYMENT_METHODS.find(m => m.defaultCurrency === 'USD')?.value || PAYMENT_METHODS[0].value;

  const [rows, setRows] = useState(() => [
    makeRow(PAYMENT_METHODS, defaultMethodValue, prefillAmount(totalUSD, 'USD', exchangeRate)),
  ]);

  // Vuelto: moneda elegida por el cajero y billetera de donde sale el dinero.
  const [change, setChange] = useState({ currency: 'VES', walletId: '' });

  // On open: snapshot the current rate and reset rows pre-filled with full total
  useEffect(() => {
    if (open) {
      setLockedRate(exchangeRate);
      setRows([makeRow(PAYMENT_METHODS, defaultMethodValue, prefillAmount(totalUSD, 'USD', exchangeRate))]);
      setChange({ currency: 'VES', walletId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalVES = totalUSD * lockedRate;

  const computed = useMemo(() => {
    return rows.map(r => {
      const amt = parseFloat(r.amount) || 0;
      const amount_usd_equivalent = r.currency === 'USD' ? amt : (lockedRate > 0 ? amt / lockedRate : 0);
      return { ...r, amt, amount_usd_equivalent };
    });
  }, [rows, lockedRate]);

  const receivedUSD = computed.reduce((s, r) => s + r.amount_usd_equivalent, 0);
  const diff = receivedUSD - totalUSD;
  // Permite confirmar ventas de total 0 (todo cortesía) sin exigir monto.
  const isComplete = receivedUSD >= totalUSD - 0.001;
  const hasAnyAmount = computed.some(r => r.amt > 0);

  const addRow = () => {
    // Compute remaining amount based on current rows (USD equivalent)
    const remainingUSD = Math.max(0, totalUSD - receivedUSD);
    // Elegimos un método VES por defecto para complementar el primero (USD).
    const vesMethod = PAYMENT_METHODS.find(m => m.defaultCurrency === 'VES');
    const newMethod = vesMethod?.value || PAYMENT_METHODS[0].value;
    const newCurrency = getMethod(newMethod).defaultCurrency;
    setRows(rs => [...rs, makeRow(PAYMENT_METHODS, newMethod, prefillAmount(remainingUSD, newCurrency, lockedRate))]);
  };
  const removeRow = (id) => setRows(rs => rs.length > 1 ? rs.filter(r => r.id !== id) : rs);
  const updateRow = (id, patch) => setRows(rs => rs.map(r => {
    if (r.id !== id) return r;
    const next = { ...r, ...patch };
    // When method changes, also realign the currency to the method's default
    // and reconvert the existing amount to the new currency so the value stays equivalent.
    if (patch.method && !patch.currency) {
      const newCurrency = getMethod(patch.method).defaultCurrency;
      if (newCurrency !== r.currency && r.amount !== '') {
        const amtNum = parseFloat(r.amount) || 0;
        const usdEq = r.currency === 'USD' ? amtNum : (lockedRate > 0 ? amtNum / lockedRate : 0);
        next.amount = prefillAmount(usdEq, newCurrency, lockedRate);
      }
      next.currency = newCurrency;
    }
    // When currency changes manually, convert the existing amount accordingly
    if (patch.currency && patch.currency !== r.currency && r.amount !== '') {
      const amtNum = parseFloat(r.amount) || 0;
      const usdEq = r.currency === 'USD' ? amtNum : (lockedRate > 0 ? amtNum / lockedRate : 0);
      next.amount = prefillAmount(usdEq, patch.currency, lockedRate);
    }
    return next;
  }));

  const hasChange = diff > 0.005;
  const changeReady = !hasChange || !!change.walletId;

  const handleConfirm = () => {
    const payments = computed
      .filter(r => r.amt > 0)
      .map(r => {
        const base = { method: r.method };
        if (r.currency === 'USD') {
          base.amount_usd = +r.amt.toFixed(2);
          base.amount_usd_equivalent = +r.amt.toFixed(2);
        } else {
          base.amount_ves = +r.amt.toFixed(2);
          base.amount_usd_equivalent = +r.amount_usd_equivalent.toFixed(2);
        }
        return base;
      });
    const changePayload = hasChange ? {
      amount: +(change.currency === 'USD' ? diff : diff * lockedRate).toFixed(2),
      currency: change.currency,
      amount_usd_equivalent: +diff.toFixed(2),
      wallet_id: change.walletId,
      wallet_name: wallets.find(w => w.id === change.walletId)?.name || '',
    } : null;
    onConfirm({ payments, exchange_rate: lockedRate, change: changePayload });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobro</DialogTitle>
        </DialogHeader>

        {/* Total */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total a Pagar</p>
          <p className="text-3xl font-bold text-primary">{formatUSD(totalUSD)}</p>
          <p className="text-sm text-muted-foreground font-mono">{formatVES(totalVES)}</p>
          <p className="text-[10px] text-muted-foreground">Tasa fija de esta venta: <span className="font-mono font-semibold">1 USD = Bs. {lockedRate.toFixed(2)}</span></p>
        </div>

        {/* Payment rows */}
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground tracking-wide">Métodos de Pago</Label>
          {rows.map((r, idx) => {
            const cmp = computed[idx];
            return (
              <div key={r.id} className="space-y-1.5 p-2 border border-border rounded-lg bg-card">
                <div className="flex gap-2">
                  <Select value={r.method} onValueChange={v => updateRow(r.id, { method: v })}>
                    <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5" /> {m.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeRow(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={r.amount}
                    onChange={e => updateRow(r.id, { amount: e.target.value })}
                    className="flex-1 h-9 font-mono"
                  />
                  <Select value={r.currency} onValueChange={v => updateRow(r.id, { currency: v })}>
                    <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="VES">VES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cmp.amt > 0 && r.currency === 'VES' && (
                  <p className="text-[10px] text-muted-foreground font-mono pl-1">
                    ≈ {formatUSD(cmp.amount_usd_equivalent)}
                  </p>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar método
          </Button>
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total recibido ({symbol})</span>
            <span className="font-mono font-semibold">{formatUSD(receivedUSD)}</span>
          </div>
          {diff < -0.005 ? (
            <div className="flex justify-between text-destructive font-semibold">
              <span>Falta por cobrar</span>
              <span className="font-mono">{formatUSD(-diff)}</span>
            </div>
          ) : diff > 0.005 ? (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Vuelto</span>
              <span className="font-mono">{formatUSD(diff)}</span>
            </div>
          ) : hasAnyAmount ? (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Pago exacto</span>
              <span>✓</span>
            </div>
          ) : null}
        </div>

        {/* Panel de vuelto — sólo cuando el cliente pagó de más */}
        {hasChange && (
          <ChangePanel
            excessUSD={diff}
            exchangeRate={lockedRate}
            wallets={wallets}
            currency={change.currency}
            walletId={change.walletId}
            onChange={patch => setChange(c => ({ ...c, ...patch }))}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isComplete || !changeReady || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}