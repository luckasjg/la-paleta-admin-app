import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import StepLabel from '@/components/production/StepLabel';
import ProcessDiffBadge from '@/components/production/ProcessDiffBadge';
import TrayDestinationPicker from '@/components/production/TrayDestinationPicker';

export default function DerivedTrayCard({ index, tray, options, recipe, lines, summary, activeTrays = [], onChange, onRemove }) {
  const set = (patch) => onChange({ ...tray, ...patch });
  const addedGrams = lines.filter(l => l.unit === 'g').reduce((s, l) => s + (l.quantity || 0), 0);
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 text-xs font-semibold text-muted-foreground w-5">#{index + 1}</span>
        <div className="flex-1">
          <SearchableCombobox value={tray.recipe_id} onChange={v => set({ recipe_id: v, overrides: {}, mode: 'nueva', target_tray_id: '', before: 0 })}
            options={options} placeholder="Sabor de la bandeja" searchPlaceholder="Buscar sabor..." emptyText="Sin sabores" />
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>

      {recipe && <TrayDestinationPicker tray={tray} activeTrays={activeTrays} onChange={set} />}

      <div className="space-y-1.5">
        <StepLabel n={1} title="Mezcla Base" />
        <Label className="text-xs">Gramos de base asignados</Label>
        <Input type="number" value={tray.base_grams} onChange={e => set({ base_grams: parseFloat(e.target.value) || 0 })} />
      </div>

      {recipe && (
        <div className="space-y-1.5">
          <StepLabel n={2} title="Saborizantes y Variegados" extra={`+${addedGrams.toFixed(0)}g`} />
          {!(recipe.base_quantity_grams > 0) && lines.length > 0 && (
            <p className="text-[11px] text-amber-700">Este sabor no tiene gramos de base estándar: ingresa las cantidades manualmente.</p>
          )}
          {lines.length === 0 && <p className="text-xs text-muted-foreground">Sin insumos propios.</p>}
          {lines.map(l => (
            <div key={l.key} className="grid grid-cols-[1fr,110px] gap-2 items-center text-sm">
              <span className="truncate text-muted-foreground">
                <span className="text-[10px] uppercase mr-1">{l.kind === 'v' ? 'Variegado' : 'Aditivo'}</span>{l.name}
              </span>
              <div className="relative">
                <Input type="number" step="0.1" className="h-8 text-right pr-8" value={parseFloat((l.quantity || 0).toFixed(2))}
                  onChange={e => set({ overrides: { ...tray.overrides, [l.key]: parseFloat(e.target.value) || 0 } })} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{l.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-md border-2 border-primary/20 bg-primary/5 p-2">
        <StepLabel n={3} title="Peso Neto Físico en Bandeja" />
        <Label className="text-xs font-semibold">Peso Neto Real Obtenido (g)</Label>
        <Input type="number" className="text-base font-semibold" value={tray.net || ''} onChange={e => set({ net: parseFloat(e.target.value) || 0 })} />
        <p className="text-[11px] text-muted-foreground">Tara descontada.</p>
        <ProcessDiffBadge expected={summary.expected} net={tray.net} />
      </div>

      {recipe && (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 text-xs">
          <div><p className="text-muted-foreground">Costo total</p><p className="font-mono font-semibold">${summary.totalCost.toFixed(2)}</p></div>
          <div><p className="text-muted-foreground">Costo / g</p><p className="font-mono font-semibold">{tray.net > 0 ? `$${summary.costPerGram.toFixed(4)}` : '—'}</p></div>
        </div>
      )}
    </div>
  );
}