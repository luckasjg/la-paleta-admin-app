import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Search, LogOut } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import ReceivableFormDialog from '@/components/receivables/ReceivableFormDialog';

const eur = (usd) => formatEUR((usd || 0) * EUR_PER_USD);

export default function ReceivablesManager({ operatorName, onLock }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null cerrado · 'new' · registro

  const query = search.trim() ? { customer_name: { $regex: search.trim(), $options: 'i' } } : {};
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['receivables', 'manage', query],
    queryFn: async () => (await base44.entities.AccountReceivable.filter(query, { sort: '-sale_date', limit: 100 })).items,
  });

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ['receivables'] });
    qc.invalidateQueries({ queryKey: ['customer_debt'] });
    toast.success('Cuenta guardada');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente…" className="pl-9" />
        </div>
        <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Cuenta histórica</Button>
        {onLock && <Button variant="ghost" size="sm" onClick={onLock}><LogOut className="h-4 w-4" /> {operatorName}</Button>}
      </div>
      <Card className="divide-y divide-border">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Sin cuentas</p>}
        {rows.map(r => (
          <div key={r.id} className="p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-40">
              <div className="flex items-center gap-2">
                <p className="font-medium">{r.customer_name}</p>
                {r.origin === 'historica' && <Badge variant="outline" className="text-[10px]">Histórica</Badge>}
                {r.status === 'saldada' && <Badge variant="secondary" className="text-[10px]">Saldada</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{r.sale_date ? moment(r.sale_date).format('DD/MM/YYYY') : '—'} · fiado {eur(r.amount_usd)}{r.notes ? ` · ${r.notes}` : ''}</p>
            </div>
            <p className="font-mono font-semibold w-24 text-right">{eur(r.balance_usd)}</p>
            <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
          </div>
        ))}
      </Card>
      <ReceivableFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        record={editing === 'new' ? null : editing}
        staffName={operatorName}
        onSaved={onSaved}
      />
    </div>
  );
}