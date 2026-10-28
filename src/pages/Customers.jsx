import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerForm from '@/components/customers/CustomerForm';
import CustomerDetailSheet from '@/components/customers/CustomerDetailSheet';
import CustomerRow from '@/components/customers/CustomerRow';
import LoyaltyRulesDialog from '@/components/customers/LoyaltyRulesDialog';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TAB_QUERY = { todos: {}, pendientes: { category: 'Evento', event_status: 'pendiente' }, canjeados: { category: 'Evento', event_status: 'canjeado' } };

export default function Customers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const s = search.trim();
  const q = { ...TAB_QUERY[tab], ...(s ? { $or: [{ full_name: { $regex: esc(s), $options: 'i' } }, { phone: { $regex: esc(s) } }, { instagram: { $regex: esc(s.replace(/^@/, '')), $options: 'i' } }] } : {}) };
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['customers', tab, search],
    queryFn: ({ pageParam }) => base44.entities.Customer.filter(q, { sort: tab === 'todos' ? 'full_name' : '-event_registered_at', limit: 50, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (p) => (p.has_more ? p.next_cursor : undefined),
  });
  const { data: counts } = useQuery({
    queryKey: ['customers_count'],
    queryFn: async () => {
      const [todos, pendientes, canjeados] = await Promise.all(Object.values(TAB_QUERY).map(x => base44.entities.Customer.count(x)));
      return { todos, pendientes, canjeados };
    },
  });
  const rows = data?.pages.flatMap(p => p.items) || [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['customers_count'] }); };

  useEffect(() => base44.entities.Customer.subscribe(refresh), []);

  const remove = async (c) => {
    if (!confirm(`¿Eliminar a ${c.full_name}?`)) return;
    await base44.entities.Customer.delete(c.id);
    refresh();
  };
  const redeem = async (c) => {
    await base44.entities.Customer.update(c.id, { event_status: 'canjeado', event_redeemed_at: new Date().toISOString(), event_redeemed_by: user?.full_name || user?.email });
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description={`${counts?.todos ?? 0} clientes en la base de datos`}
        actions={<div className="flex gap-2"><LoyaltyRulesDialog /><Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Nuevo cliente</Button></div>} />
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pendientes">Evento: Pendientes · {counts?.pendientes ?? 0}</TabsTrigger>
            <TabsTrigger value="canjeados">Evento: Canjeados · {counts?.canjeados ?? 0}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre, teléfono o Instagram..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Cargando...</p> :
          rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay clientes.</p> :
          rows.map(c => <CustomerRow key={c.id} c={c} onOpen={setDetail} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={remove} onRedeem={redeem} />)}
      </div>
      {hasNextPage && <div className="text-center"><Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Cargando...' : 'Cargar más'}</Button></div>}
      <CustomerForm open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={refresh} />
      <CustomerDetailSheet customer={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}