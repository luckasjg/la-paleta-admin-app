import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import CustomerSearchList from '@/components/receivables/CustomerSearchList';
import NewCustomerForm from '@/components/receivables/NewCustomerForm';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function ReassignCustomerDialog({ receivable: r, open, onOpenChange }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState(null);
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => { if (open) { setTarget(null); setCreating(false); setReason(''); } }, [open]);

  const mut = useMutation({
    mutationFn: async () => (await base44.functions.invoke('reassignReceivable', { receivable_id: r.id, customer_id: target.id, reason })).data,
    onSuccess: (res) => {
      ['receivables', 'receivable_payments', 'customer_debt', 'sales', 'customers'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Cuenta reasignada a ${target.full_name}`);
      if (res?.shared_payments > 0) toast.info(`${res.shared_payments} abono(s) que cubrían varias deudas quedaron en el cliente anterior.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  if (!r) return null;
  const row = (k, v) => <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Reasignar cliente</DialogTitle></DialogHeader>
        <div className="rounded-xl bg-secondary/60 p-3 space-y-1 text-sm">
          {row('Referencia', `#${r.id.slice(-6).toUpperCase()}`)}
          {row('Fecha original', moment(r.sale_date || r.created_date).format('DD/MM/YYYY HH:mm'))}
          {row('Monto total', <span className="font-mono">{eur(r.amount_usd)}</span>)}
          {row('Saldo pendiente', <span className="font-mono">{eur(r.balance_usd)}</span>)}
          {row('Cliente actual', r.customer_name)}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Nuevo cliente</Label>
            {!creating && <Button size="sm" variant="ghost" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" /> Crear cliente nuevo</Button>}
          </div>
          {creating
            ? <NewCustomerForm onCancel={() => setCreating(false)} onCreated={(c) => { setTarget(c); setCreating(false); qc.invalidateQueries({ queryKey: ['customers'] }); }} />
            : <CustomerSearchList selectedId={target?.id} excludeId={r.customer_id} onSelect={setTarget} />}
          {target && !creating && <p className="text-xs">Seleccionado: <span className="font-semibold">{target.full_name}</span>{target.cedula ? ` (${target.cedula})` : ''}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Motivo (opcional)</Label>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Error de selección en caja" maxLength={300} />
        </div>

        <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
          <Info className="h-4 w-4 shrink-0" />
          Esta acción transferirá la cuenta por cobrar y sus abonos asociados al nuevo cliente manteniendo la fecha original y sin modificar el inventario.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!target || creating || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Reasignando...' : 'Reasignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}