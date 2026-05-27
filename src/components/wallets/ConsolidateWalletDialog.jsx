import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDownToLine, EyeOff } from 'lucide-react';
import { formatUSD, formatVES, useExchangeRate } from '@/lib/useExchangeRate';
import { consolidateWallet } from '@/lib/consolidationHelpers';

const DESTINATION_PRESETS = [
  'Transferido a Cuenta Bancaria Real',
  'Fondo transferido a Caja Fuerte Principal',
  'Retiro de Propietario',
  'Pago de Proveedor',
  'Otro (especificar en notas)',
];

export default function ConsolidateWalletDialog({ wallet, open, onOpenChange }) {
  const qc = useQueryClient();
  const { rate } = useExchangeRate();
  const [amount, setAmount] = useState(0);
  const [destinationPreset, setDestinationPreset] = useState(DESTINATION_PRESETS[0]);
  const [customDestination, setCustomDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [skipAudit, setSkipAudit] = useState(false);

  useEffect(() => {
    if (open && wallet) {
      setAmount(Number(wallet.balance) || 0);
      setDestinationPreset(DESTINATION_PRESETS[0]);
      setCustomDestination('');
      setNotes('');
      setSkipAudit(false);
    }
  }, [open, wallet]);

  const isCustom = destinationPreset === 'Otro (especificar en notas)';
  const finalDestination = isCustom ? customDestination.trim() : destinationPreset;

  const mut = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me().catch(() => null);
      return consolidateWallet({
        wallet,
        amountNative: amount,
        destination: finalDestination,
        exchangeRate: rate,
        source: 'manual',
        closedBy: me?.email || me?.full_name || '',
        notes,
        skipAudit,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      qc.invalidateQueries({ queryKey: ['wallet_consolidations'] });
      toast.success(
        skipAudit
          ? `${wallet.name} ajustada a 0 sin registro de auditoría.`
          : `${wallet.name} consolidada. Saldo restablecido a 0.`
      );
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message || 'Error al consolidar'),
  });

  if (!wallet) return null;

  const formatted = wallet.currency === 'USD'
    ? formatUSD(wallet.balance || 0)
    : formatVES(wallet.balance || 0);

  const canConfirm = amount > 0 && (skipAudit || finalDestination.length > 0) && !mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-primary" />
            Ajustar a 0 — {wallet.name}
          </DialogTitle>
          <DialogDescription>
            Vacía la billetera y deja un registro de auditoría con el destino del dinero retirado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Saldo actual:</span>
              <span className="font-mono font-bold">{formatted}</span>
            </div>
          </div>

          <div>
            <Label>Monto a retirar ({wallet.currency})</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            {amount > (wallet.balance || 0) && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                El monto excede el saldo actual.
              </p>
            )}
          </div>

          {!skipAudit && (
            <>
              <div>
                <Label>Destino del fondo</Label>
                <Select value={destinationPreset} onValueChange={setDestinationPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESTINATION_PRESETS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCustom && (
                  <Input
                    className="mt-2"
                    placeholder="Describe el destino..."
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referencia bancaria, observaciones..."
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-3">
            <EyeOff className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="skip-audit" className="text-sm font-medium cursor-pointer">
                  Ajustar sin registro de auditoría
                </Label>
                <Switch id="skip-audit" checked={skipAudit} onCheckedChange={setSkipAudit} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Solo resetea el saldo a 0. No genera registro en Auditoría de Fondos ni en el historial de la billetera.
              </p>
            </div>
          </div>

          {!skipAudit ? (
            <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Esta acción dejará el saldo en 0
              </p>
              <p>El movimiento queda registrado en el historial de la billetera y en Auditoría de Fondos.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Modo silencioso activo
              </p>
              <p>El saldo se restablecerá a 0 sin dejar rastro en la auditoría. Usar solo para correcciones técnicas.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!canConfirm}>
            {mut.isPending ? 'Procesando...' : 'Confirmar y Ajustar a 0'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}