import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRole } from '@/lib/useRole';
import CustomerDebtRow from '@/components/receivables/CustomerDebtRow';
import ReassignCustomerDialog from '@/components/receivables/ReassignCustomerDialog';
import { toast } from 'sonner';
import { useExchangeRate, formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import { settleCustomer } from '@/lib/receivables';
import AbonoDialog from '@/components/receivables/AbonoDialog';
import StatementDialog from '@/components/receivables/StatementDialog';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function ReceivablesPanel({ canSettle = false }) {
  const qc = useQueryClient();
  const { rate } = useExchangeRate();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [abonoFor, setAbonoFor] = useState(null);
  const [statementFor, setStatementFor] = useState(null);
  const [reassignFor, setReassignFor] = useState(null);
  const { isAdmin, isGerente } = useRole();
  const canReassign = isAdmin || isGerente;

  const query = { status: 'pendiente' };
  if (search.trim()) query.customer_name = { $regex: search.trim(), $options: 'i' };
  if (from || to) query.sale_date = { ...(from ? { $gte: `${from}T04:00:00.000Z` } : {}), ...(to ? { $lt: new Date(new Date(`${to}T04:00:00.000Z`).getTime() + 86400000).toISOString() } : {}) };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['receivables', 'by_customer', query],
    queryFn: async () => (await base44.entities.AccountReceivable.aggregate({
      query, groupBy: ['customer_id', 'customer_name'], sum: ['balance_usd'], sort: '-sum_balance_usd', limit: 500,
    })).rows,
  });
  const { data: session } = useQuery({
    queryKey: ['active_cash_session_record'],
    queryFn: async () => (await base44.entities.CashRegister.filter({ status: 'abierta' }))?.[0] || null,
  });
  const { data: wallets = [] } = useQuery({ queryKey: ['wallets'], queryFn: () => base44.entities.Wallet.list() });

  const settle = useMutation({
    mutationFn: (row) => settleCustomer(row.customer_id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receivables'] }); toast.success('Cuenta liquidada'); },
  });

  const totalDebt = rows.reduce((s, r) => s + (r.sum_balance_usd || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente…" className="pl-9" />
        </div>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Desde</span>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Hasta</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
        </label>
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-1.5 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total por cobrar</p>
          <p className="font-mono font-bold text-primary">{eur(totalDebt)}</p>
        </div>
      </div>

      <Card className="divide-y divide-border">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay cuentas pendientes</p>}
        {rows.map(r => (
          <CustomerDebtRow
            key={r.customer_id}
            row={r}
            dateQuery={query.sale_date}
            canSettle={canSettle}
            canReassign={canReassign}
            settling={settle.isPending}
            onStatement={() => setStatementFor(r)}
            onAbono={() => setAbonoFor(r)}
            onSettle={() => window.confirm(`¿Marcar como liquidada la deuda de ${r.customer_name}? No se registra ingreso de dinero.`) && settle.mutate(r)}
            onReassign={setReassignFor}
          />
        ))}
      </Card>

      <AbonoDialog
        open={!!abonoFor}
        onOpenChange={(o) => !o && setAbonoFor(null)}
        customer={abonoFor ? { id: abonoFor.customer_id, full_name: abonoFor.customer_name } : null}
        debtUSD={abonoFor?.sum_balance_usd || 0}
        eurVes={rate}
        session={session}
        wallets={wallets}
      />
      <StatementDialog customer={statementFor} open={!!statementFor} onOpenChange={(o) => !o && setStatementFor(null)} />
      <ReassignCustomerDialog receivable={reassignFor} open={!!reassignFor} onOpenChange={(o) => !o && setReassignFor(null)} />
    </div>
  );
}