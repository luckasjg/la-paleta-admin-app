import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HandCoins, FileText, CheckCheck, Search } from 'lucide-react';
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
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-1.5 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total por cobrar</p>
          <p className="font-mono font-bold text-primary">{eur(totalDebt)}</p>
        </div>
      </div>

      <Card className="divide-y divide-border">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay cuentas pendientes</p>}
        {rows.map(r => (
          <div key={r.customer_id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-40">
              <p className="font-semibold">{r.customer_name}</p>
              <p className="text-xs text-muted-foreground">{r.count} venta(s) pendiente(s)</p>
            </div>
            <p className="font-mono font-bold text-lg w-28 text-right">{eur(r.sum_balance_usd)}</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setStatementFor(r)}><FileText className="h-4 w-4" /> Estado</Button>
              <Button size="sm" onClick={() => setAbonoFor(r)}><HandCoins className="h-4 w-4" /> Abonar</Button>
              {canSettle && (
                <Button size="sm" variant="ghost" disabled={settle.isPending}
                  onClick={() => window.confirm(`¿Marcar como liquidada la deuda de ${r.customer_name}? No se registra ingreso de dinero.`) && settle.mutate(r)}>
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
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
    </div>
  );
}