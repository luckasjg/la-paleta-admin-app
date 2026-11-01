import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import moment from 'moment';

const TYPE = {
  nueva: { label: 'Nueva', cls: 'bg-green-100 text-green-700' },
  relleno: { label: 'Rellenada', cls: 'bg-blue-100 text-blue-700' },
  transferencia: { label: 'Unión', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function ProductionHistory() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['tray_events'],
    queryFn: () => base44.entities.TrayEvent.list('-created_date', 500),
  });
  const days = events.reduce((acc, e) => ((acc[e.date] ||= []).push(e), acc), {});

  return (
    <div className="space-y-6">
      <PageHeader title="Historial de producción" description="Bandejas nuevas, rellenos y uniones por día"
        actions={<Button variant="outline" asChild><Link to="/produccion"><ArrowLeft className="h-4 w-4 mr-2" />Producción</Link></Button>} />
      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!isLoading && events.length === 0 && <Card className="p-8 text-center text-muted-foreground text-sm">Aún no hay registros.</Card>}
      {Object.entries(days).map(([date, list]) => (
        <Card key={date} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold capitalize">{moment(date).format('dddd DD/MM/YYYY')}</h2>
            <span className="text-xs text-muted-foreground">
              {list.filter(e => e.type === 'nueva').length} nuevas · {list.filter(e => e.type === 'relleno').length} rellenadas
            </span>
          </div>
          <div className="divide-y divide-border">
            {list.map(e => (
              <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <Badge className={TYPE[e.type]?.cls}>{TYPE[e.type]?.label}</Badge>
                <span className="flex-1 min-w-0 truncate">
                  {e.type === 'transferencia' ? `${e.source_recipe_name} → ${e.recipe_name}` : e.recipe_name}
                </span>
                <span className="font-mono">{Math.round(e.grams || 0)}g</span>
                {e.remaining_after != null && <span className="text-xs text-muted-foreground hidden sm:inline">quedó {Math.round(e.remaining_after)}g</span>}
                {e.operator && <span className="text-xs text-muted-foreground hidden md:inline">{e.operator}</span>}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}