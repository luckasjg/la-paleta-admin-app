import React, { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Search, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import moment from 'moment';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const money = (r) => (r.currency === 'VES'
  ? `Bs. ${(r.amount_native || 0).toFixed(2)}`
  : `$${(r.amount_native || 0).toFixed(2)}`);
const METHOD = { pago_movil: 'Pago móvil', transferencia: 'Transferencia' };

/** Historial de devoluciones pagadas con búsqueda por cliente o cédula. */
export default function RefundHistory() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const query = { status: 'pagada' };
  if (term) {
    const rx = { $regex: escape(term), $options: 'i' };
    query.$or = [{ 'customer_data.titular': rx }, { 'customer_data.cedula': rx }];
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['refund-history', term],
    enabled: open,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => base44.entities.RefundRequest.filter(query,
      { sort: '-confirmed_at', limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (p) => (p.has_more ? p.next_cursor : undefined),
  });
  const rows = data?.pages.flatMap(p => p.items) || [];

  return (
    <div className="space-y-2">
      <Button variant="ghost" onClick={() => setOpen(o => !o)} className="px-2 text-sm">
        {open ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
        <History className="h-4 w-4 mr-1" /> Historial de pagadas
      </Button>
      {open && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={text} onChange={e => setText(e.target.value)}
              placeholder="Buscar por nombre o cédula" className="pl-9" />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {term ? `Sin devoluciones pagadas para "${term}"` : 'Aún no hay devoluciones pagadas'}
            </p>
          ) : rows.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p className="font-semibold">{r.customer_data?.titular || '—'}</p>
                <p className="text-right font-mono font-bold">{money(r)}</p>
                <p className="text-muted-foreground">C.I. {r.customer_data?.cedula || '—'}</p>
                <p className="text-right text-muted-foreground">{METHOD[r.method] || r.method}</p>
                <p className="text-muted-foreground">
                  {r.confirmed_at ? moment(r.confirmed_at).format('DD/MM/YYYY HH:mm') : '—'}
                </p>
                <p className="text-right text-muted-foreground">Ref. {r.confirmation_reference || '—'}</p>
                <p className="col-span-2 text-xs text-muted-foreground">Confirmó: {r.confirmed_by_name || '—'}</p>
              </CardContent>
            </Card>
          ))}
          {hasNextPage && (
            <Button variant="outline" className="w-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}