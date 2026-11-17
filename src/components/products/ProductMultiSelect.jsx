import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Lista con buscador para elegir varios productos.
export default function ProductMultiSelect({ products, value = [], onChange, emptyText = 'Sin productos' }) {
  const [q, setQ] = useState('');
  const list = products
    .filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const toggle = (id) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="p-2 border-b border-border">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." className="h-8 text-sm" />
      </div>
      <div className="max-h-44 overflow-y-auto p-1">
        {list.map(p => (
          <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
            <Checkbox checked={value.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
            <span className="flex-1 min-w-0 truncate">{p.name}</span>
            <span className="text-[11px] text-muted-foreground capitalize">{p.category}</span>
          </label>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{emptyText}</p>}
      </div>
      <p className="px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground">{value.length} seleccionado(s)</p>
    </div>
  );
}