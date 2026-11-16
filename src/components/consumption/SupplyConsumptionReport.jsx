import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowDownWideNarrow } from 'lucide-react';
import ConsumptionFilters from '@/components/consumption/ConsumptionFilters';
import ConsumptionRow from '@/components/consumption/ConsumptionRow';
import { CONSUMPTION_REASON } from '@/lib/deductionLog';
import { periodRange, groupBySupply, exportConsumptionCSV } from '@/lib/consumptionReport';

const Kpi = ({ label, value }) => (
  <Card className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1 font-mono">{value}</p></Card>
);

export default function SupplyConsumptionReport({ supplies }) {
  const [filters, setFilters] = useState({ period: 'this_week', from: '', to: '', location: 'all', origin: 'all', search: '' });
  const [sortBy, setSortBy] = useState('cost');
  const range = periodRange(filters.period, filters.from, filters.to);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['consumption_report', range?.start, range?.end, filters.location, filters.origin],
    enabled: !!range,
    queryFn: () => {
      const q = { reason: CONSUMPTION_REASON, created_date: { $gte: range.start, $lte: range.end } };
      if (filters.location !== 'all') q.location = filters.location;
      if (filters.origin !== 'all') q.origin = filters.origin;
      return base44.entities.InventoryAdjustment.filter(q, 'created_date', 5000);
    },
  });

  const suppliesById = useMemo(() => Object.fromEntries(supplies.map(s => [s.id, s])), [supplies]);
  const groups = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const list = groupBySupply(movements, suppliesById).filter(g => !q || (g.name || '').toLowerCase().includes(q));
    return list.sort((a, b) => (sortBy === 'cost' ? b.cost - a.cost : b.quantity - a.quantity));
  }, [movements, suppliesById, filters.search, sortBy]);
  const visibleMovements = groups.flatMap(g => g.movements);
  const totalCost = groups.reduce((s, g) => s + g.cost, 0);
  const productions = new Set(visibleMovements.map(m => m.reference_id)).size;

  return (
    <div className="space-y-5">
      <ConsumptionFilters value={filters} onChange={setFilters} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{range ? `Período: ${range.label} (hora VE)` : 'Elige fecha de inicio y fin.'}</p>
        <Button variant="outline" onClick={() => exportConsumptionCSV(groups, range?.label || '')} disabled={!groups.length}>
          <Download className="h-4 w-4" /> Exportar Reporte (CSV)
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Total Insumos Consumidos" value={groups.length} />
        <Kpi label="Costo Total de Materia Prima" value={`$${totalCost.toFixed(2)}`} />
        <Kpi label="Producciones Registradas" value={productions} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-end gap-1 p-2 border-b text-xs">
          <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
          {[['cost', 'Mayor costo'], ['quantity', 'Mayor cantidad']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSortBy(v)}
              className={`px-2 py-1 rounded-md ${sortBy === v ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted/60'}`}>{l}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-muted-foreground bg-muted/30">
              <tr className="text-left">
                <th className="py-2 px-3 font-medium">Insumo</th>
                <th className="py-2 px-3 font-medium">Categoría</th>
                <th className="py-2 px-3 font-medium text-right">Cantidad Total</th>
                <th className="py-2 px-3 font-medium text-right">Costo Total</th>
                <th className="py-2 px-3 font-medium text-right">Nº de Usos</th>
                <th className="py-2 px-3 font-medium text-right">Stock Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map(g => <ConsumptionRow key={g.supply_id} group={g} />)}
            </tbody>
          </table>
        </div>
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Cargando...</p>}
        {!isLoading && groups.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay descuentos de inventario registrados en este período.</p>
        )}
      </Card>
    </div>
  );
}