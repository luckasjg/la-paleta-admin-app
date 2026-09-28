import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import { getCustomerDebt } from '@/lib/receivables';

export default function CreditSaleDialog({ open, onOpenChange, totalUSD, onConfirm, isProcessing }) {
  const [customerId, setCustomerId] = useState('');
  useEffect(() => { if (open) setCustomerId(''); }, [open]);

  const { data: customers = [] } = useQuery({
    queryKey: ['credit_customers'],
    enabled: open,
    queryFn: async () => (await base44.entities.Customer.filter(
      { is_registered: { $ne: false } }, { sort: 'full_name', limit: 1000 }
    )).items,
  });
  const customer = customers.find(c => c.id === customerId);

  const { data: debt = 0, isFetching } = useQuery({
    queryKey: ['customer_debt', customerId],
    enabled: !!customerId,
    queryFn: () => getCustomerDebt(customerId),
  });

  const limit = customer?.credit_limit || 0;
  const available = limit > 0 ? limit - debt : Infinity;
  const exceeds = limit > 0 && totalUSD > available + 0.005;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Venta a crédito</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto a fiar</p>
            <p className="text-2xl font-bold text-primary">{formatEUR(totalUSD * EUR_PER_USD)}</p>
          </div>
          <SearchableCombobox
            value={customerId}
            onChange={setCustomerId}
            options={customers.map(c => ({ value: c.id, label: c.full_name, sublabel: c.phone }))}
            placeholder="Seleccionar cliente registrado"
            searchPlaceholder="Buscar cliente..."
            emptyText="Sin clientes registrados"
          />
          {customer && (
            <div className="text-sm space-y-1 rounded-lg border border-border p-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Deuda actual</span><span className="font-mono">{isFetching ? '…' : formatEUR(debt * EUR_PER_USD)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Límite</span><span className="font-mono">{limit > 0 ? formatEUR(limit * EUR_PER_USD) : 'Sin límite'}</span></div>
              {limit > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Disponible</span><span className="font-mono">{formatEUR(Math.max(0, available) * EUR_PER_USD)}</span></div>}
              {exceeds && <p className="text-xs text-destructive font-medium pt-1">Crédito insuficiente para esta venta.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!customer || exceeds || isFetching || isProcessing} onClick={() => onConfirm(customer)}>
            {isProcessing ? 'Procesando...' : 'Confirmar crédito'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}