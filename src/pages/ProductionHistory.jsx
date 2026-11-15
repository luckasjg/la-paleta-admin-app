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
import { buildHistory, filterHistory } from '@/lib/productionHistory';

export default function ProductionHistory() {
  const [filters, setFilters] = useState({ type: 'todos', date: '', search: '' });
  const events = useQuery({ queryKey: ['tray_events'], queryFn: () => base44.entities.TrayEvent.list('-created_date', 500) });
  const batches = useQuery({ queryKey: ['master_batches'], queryFn: () => base44.entities.MasterBatch.list('-created_date', 200) });
  const trays = useQuery({ queryKey: ['trays_history'], queryFn: () => base44.entities.Tray.list('-created_date', 1000) });
  const isLoading = events.isLoading || batches.isLoading || trays.isLoading;

  const items = useMemo(
    () => buildHistory({ events: events.data || [], trays: trays.data || [], batches: batches.data || [] }),
    [events.data, trays.data, batches.data]
  );
  const visible = filterHistory(items, filters);

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
          ? <MasterBatchHistoryCard key={it.id} item={it} />
          : <SingleProductionCard key={it.id} item={it} />))}
      </div>
    </div>
  );
}