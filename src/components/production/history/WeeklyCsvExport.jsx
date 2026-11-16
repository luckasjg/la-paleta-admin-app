import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download } from 'lucide-react';
import { weeksOf, weekLabel, buildProductionCsv, downloadCsv } from '@/lib/productionCsv';

export default function WeeklyCsvExport({ items }) {
  const weeks = useMemo(() => weeksOf(items), [items]);
  const [selected, setSelected] = useState([]);
  const toggle = (k) => setSelected(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));

  const exportCsv = () => {
    const sorted = [...selected].sort();
    const name = sorted.length === 1 ? sorted[0] : `${sorted[0]}_a_${sorted[sorted.length - 1]}`;
    downloadCsv(buildProductionCsv(items, sorted), `produccion_semanas_${name}.csv`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Semanas (lunes a domingo)</p>
          <p className="text-xs text-muted-foreground">Respeta los filtros de tipo y búsqueda.</p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
          {weeks.length === 0 && <p className="text-xs text-muted-foreground p-2">Sin registros para exportar.</p>}
          {weeks.map(k => (
            <label key={k} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggle(k)} />
              {weekLabel(k)}
            </label>
          ))}
        </div>
        <div className="p-3 border-t flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelected(selected.length === weeks.length ? [] : weeks)}>
            {selected.length === weeks.length && weeks.length ? 'Ninguna' : 'Todas'}
          </Button>
          <Button size="sm" disabled={!selected.length} onClick={exportCsv}>Descargar ({selected.length})</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}