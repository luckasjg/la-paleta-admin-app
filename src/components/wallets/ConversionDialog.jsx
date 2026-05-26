import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { formatUSD, formatVES, useExchangeRate } from '@/lib/useExchangeRate';

/**
 * Diálogo para registrar una conversión de divisas entre dos billeteras
 * (ej. saco VES del banco → compro USD en efectivo).
 * Crea 2 WalletTransactions enlazadas y actualiza los saldos.
 */
export default function ConversionDialog({ open, onOpenChange, wallets, onDone }) {
  const { rate } = useExchangeRate();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [amountIn, setAmountIn] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFromId('');
      setToId('');
      setAmountOut('');
      setAmountIn('');
      setNotes('');
    }
  }, [open]);

  const fromWallet = wallets.find(w => w.id === fromId);
  const toWallet = wallets.find(w => w.id === toId);

  // Filtrar destinos posibles (no la misma billetera, distinta moneda permitida también)
  const availableTo = wallets.filter(w => w.id !== fromId && w.is_active !== false);

  const out = parseFloat(amountOut) || 0;
  const inn = parseFloat(amountIn) || 0;

  // Tasa implícita de la conversión
  const impliedRate = useMemo(() => {
    if (!fromWallet || !toWallet || out <= 0 || inn <= 0) return null;
    if (fromWallet.currency === 'VES' && toWallet.currency === 'USD') return out / inn;
    if (fromWallet.currency === 'USD' && toWallet.currency === 'VES') return inn / out;
    return null;
  }, [fromWallet, toWallet, out, inn]);

  const canSave =
    fromWallet && toWallet && out > 0 && inn > 0 && out <= (fromWallet.balance || 0) && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();

      // USD equivalentes para análisis de diferencial
      const outUsdEq = fromWallet.currency === 'USD' ? out : out / rate;
      const inUsdEq = toWallet.currency === 'USD' ? inn : inn / rate;

      // 1) Crear transacción de salida
      const txOut = await base44.entities.WalletTransaction.create({
        wallet_id: fromWallet.id,
        wallet_name: fromWallet.name,
        type: 'conversion_out',
        amount_native: -out,
        amount_usd_equivalent: -outUsdEq,
        exchange_rate: rate,
        notes,
        transaction_date: now,
      });

      // 2) Crear transacción de entrada enlazada
      const txIn = await base44.entities.WalletTransaction.create({
        wallet_id: toWallet.id,
        wallet_name: toWallet.name,
        type: 'conversion_in',
        amount_native: inn,
        amount_usd_equivalent: inUsdEq,
        exchange_rate: rate,
        linked_transaction_id: txOut.id,
        notes,
        transaction_date: now,
      });

      // 3) Enlazar la salida con la entrada
      await base44.entities.WalletTransaction.update(txOut.id, { linked_transaction_id: txIn.id });

      // 4) Actualizar saldos
      await base44.entities.Wallet.update(fromWallet.id, {
        balance: (fromWallet.balance || 0) - out,
      });
      await base44.entities.Wallet.update(toWallet.id, {
        balance: (toWallet.balance || 0) + inn,
      });

      toast.success('Conversión registrada');
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (w, n) => (w?.currency === 'USD' ? formatUSD(n) : formatVES(n));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conversión entre Billeteras</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Origen (sale dinero)</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar billetera origen" /></SelectTrigger>
              <SelectContent>
                {wallets.filter(w => w.is_active !== false).map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} — {fmt(w, w.balance || 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromWallet && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Disponible: <span className="font-mono">{fmt(fromWallet, fromWallet.balance || 0)}</span>
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Monto que sale ({fromWallet?.currency || '—'})</Label>
            <Input
              type="number" step="0.01" min="0"
              value={amountOut}
              onChange={e => setAmountOut(e.target.value)}
              disabled={!fromWallet}
              placeholder="0.00"
            />
            {fromWallet && out > (fromWallet.balance || 0) && (
              <p className="text-[11px] text-destructive mt-1">Excede el saldo disponible</p>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div>
            <Label className="text-xs">Destino (recibe dinero)</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar billetera destino" /></SelectTrigger>
              <SelectContent>
                {availableTo.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Monto que entra ({toWallet?.currency || '—'})</Label>
            <Input
              type="number" step="0.01" min="0"
              value={amountIn}
              onChange={e => setAmountIn(e.target.value)}
              disabled={!toWallet}
              placeholder="0.00"
            />
          </div>

          {impliedRate && (
            <div className="bg-secondary/50 rounded-lg p-2.5 text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasa implícita</span>
                <span className="font-mono font-semibold">1 USD = Bs. {impliedRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasa oficial actual</span>
                <span className="font-mono">1 USD = Bs. {rate.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Compra a casa de cambio" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? 'Procesando...' : 'Registrar Conversión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}