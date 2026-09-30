import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';

const Stat = ({ label, value, accent }) => (
  <div className="rounded-lg bg-secondary/50 p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={`text-lg font-bold tracking-tight ${accent || ''}`}>{value}</p>
  </div>
);

export default function CourtesyCard({ courtesy }) {
  const { units, foregone, cost, marginPct, byStaff } = courtesy;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-600" />
          Cortesías y bonos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Unidades" value={units.toFixed(0)} />
            <Stat label="No cobrado" value={`$${foregone.toFixed(2)}`} />
            <Stat label="Costo real" value={`$${cost.toFixed(2)}`} accent="text-amber-600" />
            <Stat label="% margen cedido" value={`${marginPct.toFixed(1)}%`} accent="text-amber-600" />
          </div>
          <div className="text-xs space-y-1 overflow-hidden">
            {byStaff.slice(0, 2).map(s => (
              <div key={s.name} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{s.name}</span>
                <span className="font-mono">${s.cost.toFixed(2)}</span>
              </div>
            ))}
            {units === 0 && <p className="text-muted-foreground text-center">Sin cortesías este mes</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}