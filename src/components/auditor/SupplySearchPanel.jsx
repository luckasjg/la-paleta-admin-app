import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { getStockTotal } from '@/lib/stockHelpers';
import { fmtQty } from '@/lib/inventoryAudit';
import SupplyAuditDetail from '@/components/auditor/SupplyAuditDetail';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const shortCode = (id) => String(id || '').slice(-6).toUpperCase();

export default function SupplySearchPanel({ findings }) {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const q = term.trim();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['auditor_supply_search', q],
    enabled: q.length >= 2,
    queryFn: async () => {
      if (/^[a-f0-9]{24}$/i.test(q)) {
        const s = await base44.entities.Supply.get(q).catch(() => null);
        return s ? [s] : [];
      }
      const page = await base44.entities.Supply.filter({ name: { $regex: esc(q), $options: 'i' } }, { sort: 'name', limit: 30 });
      return page.items;
    },
  });

  if (selected) return <SupplyAuditDetail supply={selected} findings={findings} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre o código…" className="pl-9" />
      </div>
      {q.length < 2 && <p className="py-8 text-center text-xs text-muted-foreground">Escribe al menos 2 letras del nombre, o pega el código completo del insumo.</p>}
      {q.length >= 2 && isFetching && <p className="py-8 text-center text-xs text-muted-foreground">Buscando…</p>}
      {q.length >= 2 && !isFetching && !results.length && <p className="py-8 text-center text-xs text-muted-foreground">Sin coincidencias</p>}
      <div className="space-y-1.5">
        {!isFetching && results.map(s => {
          const n = findings.filter(f => f.supply_id === s.id).length;
          return (
            <button key={s.id} type="button" onClick={() => setSelected(s)}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/60 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">#{shortCode(s.id)} · {s.category || 'Sin categoría'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{s.is_infinite ? '∞' : `${fmtQty(getStockTotal(s))} ${s.unit}`}</p>
                {n > 0 && <p className="text-[11px] text-amber-700">{n} hallazgo{n > 1 ? 's' : ''}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}