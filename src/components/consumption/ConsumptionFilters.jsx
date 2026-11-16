import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { PERIODS } from '@/lib/consumptionReport';

export default function ConsumptionFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map(p => (
          <button key={p.value} type="button" onClick={() => set({ period: p.value })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${value.period === p.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {value.period === 'custom' && (
          <div className="flex gap-2 lg:col-span-2">
            <Input type="date" value={value.from} onChange={e => set({ from: e.target.value })} />
            <Input type="date" value={value.to} onChange={e => set({ to: e.target.value })} />
          </div>
        )}
        <Select value={value.location} onValueChange={v => set({ location: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ubicaciones</SelectItem>
            <SelectItem value="production">Laboratorio de Producción</SelectItem>
            <SelectItem value="warehouse">Almacén</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.origin} onValueChange={v => set({ origin: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            <SelectItem value="helados">Producción de Helados</SelectItem>
            <SelectItem value="preparados">Preparados Propios</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={value.search} onChange={e => set({ search: e.target.value })} placeholder="Buscar insumo..." className="pl-9" />
        </div>
      </div>
    </div>
  );
}