import React, { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomerForm from '@/components/customers/CustomerForm';
import CustomerDetailDialog from '@/components/customers/CustomerDetailDialog';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const q = search.trim()
    ? { $or: [{ full_name: { $regex: esc(search.trim()), $options: 'i' } }, { phone: { $regex: esc(search.trim()) } }] }
    : {};
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['customers', search],
    queryFn: ({ pageParam }) => base44.entities.Customer.filter(q, { sort: 'full_name', limit: 50, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (p) => (p.has_more ? p.next_cursor : undefined),
  });
  const { data: total = 0 } = useQuery({ queryKey: ['customers_count'], queryFn: () => base44.entities.Customer.count({}) });
  const rows = data?.pages.flatMap(p => p.items) || [];
  const refresh = () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['customers_count'] }); };

  const remove = async (c) => {
    if (!confirm(`¿Eliminar a ${c.full_name}?`)) return;
    await base44.entities.Customer.delete(c.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description={`${total} clientes en la base de datos`}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Nuevo cliente</Button>} />
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Cargando...</p> :
          rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No hay clientes.</p> :
          rows.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setDetail(c)}>
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">{c.full_name?.[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{c.phone}{c.address ? ` · ${c.address}` : ''}</p>
              </div>
              {c.is_registered === false && <span className="text-[10px] uppercase text-muted-foreground">Express</span>}
              <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setEditing(c); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); remove(c); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
      </div>
      {hasNextPage && <div className="text-center"><Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Cargando...' : 'Cargar más'}</Button></div>}
      <CustomerForm open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={refresh} />
      <CustomerDetailDialog customer={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}