import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/lib/usePaymentMethods';
import { formatEUR, formatVES, EUR_PER_USD } from '@/lib/useExchangeRate';
import { registerAbono, toUsdBase } from '@/lib/receivables';

export default function AbonoDialog({ open, onOpenChange, customer, debtUSD = 0, eurVes, session, wallets = [] }) {
  const qc = useQueryClient();
  const { posMethods } = usePaymentMethods({ activeOnly: true });
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) { setMethod(posMethods[0]?.value || ''); setCurrency('EUR'); setAmount((debtUSD * EUR_PER_USD).toFixed(2)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const amt = parseFloat(amount) || 0;
  const usd = toUsdBase(amt, currency, eurVes);
  const tooMuch = usd > debtUSD + 0.005;

  const mut = useMutation({
    mutationFn: () => registerAbono({ customer, method, currency, amount: amt, eurVes, session, wallets }),
    onSuccess: () => {
      ['receivables', 'receivable_payments', 'customer_debt', 'wallets', 'wallet_transactions'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success('Abono registrado');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Abono · {customer?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-xl bg-secondary/60 p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Deuda pendiente</span>
            <span className="font-mono font-semibold">{formatEUR(debtUSD * EUR_PER_USD)}</span>
          </div>
          {!session?.id && <p className="text-xs text-destructive">Abre la caja para poder recibir abonos.</p>}
          <div>
            <Label className="text-xs">Método</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
              <SelectContent>{posMethods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="font-mono" />
            <Select value={currency} onValueChange={(c) => { setAmount(c === 'VES' ? (usd * EUR_PER_USD * eurVes).toFixed(2) : (usd * EUR_PER_USD).toFixed(2)); setCurrency(c); }}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="VES">VES</SelectItem></SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            ≈ {formatEUR(usd * EUR_PER_USD)} · {formatVES(usd * EUR_PER_USD * eurVes)} · queda {formatEUR(Math.max(0, debtUSD - usd) * EUR_PER_USD)}
          </p>
          {tooMuch && <p className="text-xs text-destructive">El abono supera la deuda.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!session?.id || !method || !(usd > 0) || tooMuch || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Registrando...' : 'Registrar abono'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}