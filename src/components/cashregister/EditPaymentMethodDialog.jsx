import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/lib/usePaymentMethods';
import { useExchangeRate, formatUSD, formatVES } from '@/lib/useExchangeRate';
import { changeSalePaymentMethod, derivePaymentSummary } from '@/lib/changeSalePaymentMethod';
import PaymentRowsEditor from '@/components/cashregister/PaymentRowsEditor';

const newId = () => Math.random().toString(36).slice(2);

export default function EditPaymentMethodDialog({ sale, open, onOpenChange }) {
  const qc = useQueryClient();
  const { posMethods } = usePaymentMethods({ activeOnly: true });
  const { rate: currentRate } = useExchangeRate();
  const [rows, setRows] = useState([]);
  const [rate, setRate] = useState(currentRate);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const total = sale?.total || 0;
  const methods = posMethods;
  const getMethod = v => methods.find(m => m.value === v) || methods[0];

  // Al abrir: una fila con el total completo y la tasa original de la venta.
  useEffect(() => {
    if (!open || methods.length === 0) return;
    const baseRate = sale?.exchange_rate || currentRate;
    const first = methods.find(m => m.defaultCurrency === 'USD') || methods[0];
    setRate(baseRate);
    setRows([{
      id: newId(),
      method: first.value,
      currency: first.defaultCurrency,
      amount: first.defaultCurrency === 'USD' ? total.toFixed(2) : (total * baseRate).toFixed(2),
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, methods.length, sale?.id]);

  const computed = useMemo(() => rows.map(r => {
    const amt = parseFloat(r.amount) || 0;
    return { ...r, amt, usdEq: r.currency === 'USD' ? amt : (rate > 0 ? amt / rate : 0) };
  }), [rows, rate]);

  const receivedUSD = computed.reduce((s, r) => s + r.usdEq, 0);
  const diff = receivedUSD - total;
  const sumOk = Math.abs(diff) < 0.01;
  const canSubmit = sumOk && computed.some(r => r.amt > 0) && rate > 0;

  const payments = computed.filter(r => r.amt > 0).map(r => {
    const base = { method: r.method };
    if (r.currency === 'USD') {
      base.amount_usd = +r.amt.toFixed(2);
      base.amount_usd_equivalent = +r.amt.toFixed(2);
    } else {
      base.amount_ves = +r.amt.toFixed(2);
      base.amount_usd_equivalent = +r.usdEq.toFixed(2);
    }
    return base;
  });

  const newSummary = derivePaymentSummary(payments);
  const oldLabel = getMethod(sale?.payment_method)?.label
    || (sale?.payment_method === 'mixto' ? 'Mixto' : sale?.payment_method || '—');
  const newLabel = payments.length > 1
    ? 'Mixto'
    : (methods.find(m => m.value === payments[0]?.method)?.label || '—');
  const hadChange = (sale?.change_amount || 0) > 0;

  const addRow = () => {
    const remaining = Math.max(0, total - receivedUSD);
    const ves = methods.find(m => m.defaultCurrency === 'VES') || methods[0];
    setRows(rs => [...rs, {
      id: newId(),
      method: ves.value,
      currency: ves.defaultCurrency,
      amount: remaining > 0 ? (ves.defaultCurrency === 'USD' ? remaining : remaining * rate).toFixed(2) : '',
    }]);
  };

  const removeRow = id => setRows(rs => rs.length > 1 ? rs.filter(r => r.id !== id) : rs);

  const updateRow = (id, patch) => setRows(rs => rs.map(r => {
    if (r.id !== id) return r;
    const next = { ...r, ...patch };
    const convert = (from, to) => {
      if (r.amount === '' || from === to) return r.amount;
      const amt = parseFloat(r.amount) || 0;
      const usd = from === 'USD' ? amt : (rate > 0 ? amt / rate : 0);
      return (to === 'USD' ? usd : usd * rate).toFixed(2);
    };
    if (patch.method && !patch.currency) {
      const target = getMethod(patch.method).defaultCurrency;
      next.amount = convert(r.currency, target);
      next.currency = target;
    } else if (patch.currency) {
      next.amount = convert(r.currency, patch.currency);
    }
    return next;
  }));

  const mut = useMutation({
    mutationFn: () => changeSalePaymentMethod({
      sale,
      payments,
      exchange_rate: rate,
      operatorEmail: me?.email || me?.full_name || '',
    }),
    onSuccess: ({ unmapped }) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      setConfirmOpen(false);
      onOpenChange(false);
      if (unmapped.length > 0) {
        toast.warning(`Método actualizado, pero no hay billetera vinculada a: ${unmapped.join(', ')}. Ese monto no se depositó.`);
      } else {
        toast.success('Método de pago corregido y billeteras reconciliadas');
      }
    },
    onError: e => toast.error(e.message || 'No se pudo corregir el método de pago'),
  });

  if (!sale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Corregir Método de Pago</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center space-y-0.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total de la venta</p>
            <p className="text-2xl font-bold text-primary">{formatUSD(total)}</p>
            <p className="text-xs text-muted-foreground font-mono">{formatVES(total * rate)}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="rounded-md bg-muted px-2 py-1 font-medium">{oldLabel}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-primary">{newLabel}</span>
          </div>

          <PaymentRowsEditor
            rows={rows}
            methods={methods}
            rate={rate}
            onAdd={addRow}
            onRemove={removeRow}
            onUpdate={updateRow}
          />

          <div>
            <Label className="text-xs">Tasa de cambio (1 USD = Bs.)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={rate}
              onChange={e => setRate(parseFloat(e.target.value) || 0)}
              className="h-9 font-mono"
            />
          </div>

          <div className="border-t border-border pt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suma registrada</span>
              <span className="font-mono font-semibold">{formatUSD(receivedUSD)}</span>
            </div>
            {!sumOk && (
              <p className="text-xs text-destructive">
                {diff < 0
                  ? `Faltan ${formatUSD(-diff)} para igualar el total`
                  : `Sobran ${formatUSD(diff)} respecto al total`}
              </p>
            )}
          </div>

          {hadChange && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Esta venta tuvo un <strong>vuelto de {sale.change_amount?.toFixed(2)} {sale.change_currency}</strong>.
                Sólo se corrige el ingreso; el vuelto entregado queda intacto.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button disabled={!canSubmit || mut.isPending} onClick={() => setConfirmOpen(true)}>
              {mut.isPending ? 'Aplicando...' : 'Aplicar corrección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar corrección de método?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  La venta de <strong>{formatUSD(total)}</strong> pasará de <strong>{oldLabel}</strong> a{' '}
                  <strong>{newLabel}</strong>.
                </p>
                <p>
                  Se revertirá el ingreso de la billetera anterior y se depositará{' '}
                  {payments.length > 1 ? 'cada porción en su billetera' : 'el monto en la billetera del nuevo método'}.
                  Los saldos cambiarán de inmediato y quedará registro en Auditoría de Fondos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={mut.isPending}
              onClick={(e) => { e.preventDefault(); mut.mutate(); }}
            >
              {mut.isPending ? 'Aplicando...' : 'Sí, corregir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}