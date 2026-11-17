import React from 'react';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import moment from 'moment';

/** Elige si la salida del lote crea una bandeja nueva o rellena una activa del mismo sabor. */
export default function TrayDestinationPicker({ tray, activeTrays, onChange }) {
  const isRefill = tray.mode === 'relleno';
  const mode = (m) => onChange({ mode: m, target_tray_id: '', before: 0 });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {[['nueva', 'Nueva Bandeja'], ['relleno', 'Rellenar Bandeja Activa']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => mode(v)} disabled={v === 'relleno' && activeTrays.length === 0}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${tray.mode === v || (!tray.mode && v === 'nueva') ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            {l}
          </button>
        ))}
      </div>
      {isRefill && (
        <div>
          <Label className="text-xs">Bandeja a rellenar</Label>
          <SearchableCombobox
            value={tray.target_tray_id}
            onChange={(id) => onChange({ target_tray_id: id, before: activeTrays.find(t => t.id === id)?.remaining_grams || 0 })}
            keepOrder
            placeholder="Seleccionar bandeja activa"
            searchPlaceholder="Buscar bandeja..."
            options={activeTrays.map(t => ({
              value: t.id,
              label: `Quedan ${(t.remaining_grams || 0).toFixed(0)}g · prod. ${t.production_date ? moment(t.production_date).format('DD/MM') : '—'}${t.in_vitrine ? ' · vitrina' : ''}`,
            }))}
          />
          {tray.target_tray_id && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Restante antes: {(tray.before || 0).toFixed(0)}g → después: {((tray.before || 0) + (tray.net || 0)).toFixed(0)}g
            </p>
          )}
        </div>
      )}
      {tray.recipe_id && activeTrays.length === 0 && <p className="text-[11px] text-muted-foreground">No hay bandejas activas de este sabor para rellenar.</p>}
    </div>
  );
}