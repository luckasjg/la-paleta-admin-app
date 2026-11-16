import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import HistoryFilters from '@/components/production/history/HistoryFilters';
import MasterBatchHistoryCard from '@/components/production/history/MasterBatchHistoryCard';
import SingleProductionCard from '@/components/production/history/SingleProductionCard';
import HistoryAudit from '@/components/production/audit/HistoryAudit';
import { buildHistory, filterHistory } from '@/lib/productionHistory';
import { CONSUMPTION_REASON } from '@/lib/deductionLog';

export default function ProductionHistory() {
  const [filters, setFilters] = useState({ type: 'todos', date: '', search: '' });
  const events = useQuery({ queryKey: ['tray_events'], queryFn: () => base44.entities.TrayEvent.list('-created_date', 500) });
  const batches = useQuery({ queryKey: ['master_batches'], queryFn: () => base44.entities.MasterBatch.list('-created_date', 200) });
  const trays = useQuery({ queryKey: ['trays_history'], queryFn: () => base44.entities.Tray.list('-created_date', 1000) });
  const recipes = useQuery({ queryKey: ['recipes'], queryFn: () => base44.entities.Recipe.list() });
  const supplies = useQuery({ queryKey: ['supplies'], queryFn: () => base44.entities.Supply.list() });
  const movements = useQuery({
    queryKey: ['consumption_adjustments'],
    queryFn: () => base44.entities.InventoryAdjustment.filter({ reason: CONSUMPTION_REASON }, 'created_date', 5000),
  });
  const isLoading = events.isLoading || batches.isLoading || trays.isLoading;

  const items = useMemo(
    () => buildHistory({ events: events.data || [], trays: trays.data || [], batches: batches.data || [] }),
    [events.data, trays.data, batches.data]
  );
  const ctx = useMemo(() => {
    const movementsByRef = {};
    (movements.data || []).forEach(m => { (movementsByRef[m.reference_id] ||= []).push(m); });
    return {
      trays: trays.data || [], recipes: recipes.data || [], movementsByRef,
      suppliesById: Object.fromEntries((supplies.data || []).map(s => [s.id, s])),
    };
  }, [movements.data, trays.data, recipes.data, supplies.data]);
  const visible = filterHistory(items, filters);
  const audit = (it) => (movements.isLoading || recipes.isLoading ? null : <HistoryAudit item={it} ctx={ctx} />);

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de producción" description="Lotes maestros con sus ramales y producciones independientes"
        actions={<Button variant="outline" asChild><Link to="/produccion"><ArrowLeft className="h-4 w-4 mr-2" />Producción</Link></Button>} />
      <HistoryFilters value={filters} onChange={setFilters} />
      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!isLoading && items.length === 0 && <Card className="p-8 text-center text-muted-foreground text-sm">Aún no hay registros.</Card>}
      {!isLoading && items.length > 0 && visible.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground text-sm">Ningún registro coincide con los filtros.</Card>
      )}
      <div className="space-y-3">
        {visible.map(it => (it.kind === 'master'
          ? <MasterBatchHistoryCard key={it.id} item={it} audit={audit(it)} />
          : <SingleProductionCard key={it.id} item={it} audit={audit(it)} />))}
      </div>
    </div>
  );
}