import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

const TYPES = [
  { value: 'todos', label: 'Todos' },
  { value: 'maestros', label: 'Lotes Maestros' },
  { value: 'independientes', label: 'Independientes' },
];

export default function HistoryFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="flex gap-1.5">
        {TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => set({ type: t.value })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${value.type === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Input type="date" value={value.date} onChange={e => set({ date: e.target.value })} className="w-44" />
        {value.date && (
          <button type="button" onClick={() => set({ date: '' })} className="text-muted-foreground hover:text-foreground" title="Quitar fecha">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="relative w-full lg:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={value.search} onChange={e => set({ search: e.target.value })} placeholder="Buscar sabor o base..." className="pl-9" />
      </div>
    </div>
  );
}