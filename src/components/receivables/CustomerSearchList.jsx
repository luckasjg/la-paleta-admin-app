import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function CustomerSearchList({ selectedId, excludeId, onSelect }) {
  const [q, setQ] = useState('');
  const term = q.trim();
  const { data: list = [], isFetching } = useQuery({
    queryKey: ['customers', 'reassign_search', term],
    queryFn: async () => (await base44.entities.Customer.filter(
      term ? { $or: [{ full_name: { $regex: esc(term), $options: 'i' } }, { cedula: { $regex: esc(term), $options: 'i' } }, { phone: { $regex: esc(term) } }] } : {},
      { sort: 'full_name', limit: 30 }
    )).items,
  });
  const rows = list.filter(c => c.id !== excludeId);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre o cédula/RIF…" className="pl-9" autoFocus />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {isFetching && rows.length === 0 && <p className="p-3 text-xs text-muted-foreground">Buscando…</p>}
        {!isFetching && rows.length === 0 && <p className="p-3 text-xs text-muted-foreground">Sin resultados</p>}
        {rows.map(c => (
          <button key={c.id} type="button" onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 ${selectedId === c.id ? 'bg-primary/5' : ''}`}>
            <span className="flex-1">
              <span className="font-medium">{c.full_name}</span>
              <span className="block text-xs text-muted-foreground">{[c.cedula, c.phone].filter(Boolean).join(' · ') || 'Sin datos'}</span>
            </span>
            {selectedId === c.id && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}