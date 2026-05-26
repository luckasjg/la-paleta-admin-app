import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wrench, Package } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

const SECTOR_LABEL = {
  materia_prima: 'Materia prima',
  utensilio: 'Utensilio',
  venta_directa: 'Venta directa',
};

const SECTOR_ICON = {
  utensilio: Wrench,
  materia_prima: Package,
  venta_directa: Package,
};

/**
 * Editor dinámico de insumos vinculados a un producto.
 * Permite agregar múltiples líneas (supply_id + quantity + type).
 */
export default function LinkedSuppliesEditor({ value = [], onChange, supplies = [] }) {
  // Ordenamos alfabéticamente y armamos las opciones para el combobox una sola vez.
  const supplyOptions = useMemo(
    () =>
      [...supplies]
        .sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        )
        .map(s => ({
          value: s.id,
          label: s.name,
          sublabel: `${SECTOR_LABEL[s.sector] || s.sector} · ${s.unit}`,
        })),
    [supplies]
  );

  const addLine = () => {
    onChange([...value, { supply_id: '', quantity: 1, type: 'materia_prima' }]);
  };

  const removeLine = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, patch) => {
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSupplyChange = (idx, supplyId) => {
    const supply = supplies.find(s => s.id === supplyId);
    updateLine(idx, {
      supply_id: supplyId,
      type: supply?.sector || 'materia_prima',
    });
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Insumos / Utensilios vinculados</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Sin insumos vinculados. Agrega los que se descuentan al vender (materia prima y/o utensilios).
        </p>
      )}

      <div className="space-y-2">
        {value.map((line, idx) => {
          const supply = supplies.find(s => s.id === line.supply_id);
          const Icon = SECTOR_ICON[line.type] || Package;
          return (
            <div key={idx} className="flex items-start gap-2 bg-card border border-border rounded-md p-2">
              <div className="flex-1 min-w-0 space-y-1">
                <SearchableCombobox
                  value={line.supply_id || ''}
                  onChange={(v) => handleSupplyChange(idx, v)}
                  options={supplyOptions}
                  placeholder="Seleccionar insumo..."
                  searchPlaceholder="Buscar insumo..."
                  emptyText="Sin insumos"
                  triggerClassName="h-8 text-sm"
                />
                {supply && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    <span>{SECTOR_LABEL[supply.sector]}</span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      stock: {supply.stock_current ?? 0} {supply.unit}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 w-24">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  className="h-8 text-sm text-right"
                  value={line.quantity ?? 0}
                  onChange={e => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Cant."
                />
                {supply && (
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{supply.unit}</p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive flex-shrink-0"
                onClick={() => removeLine(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Por cada venta del producto se descuenta la cantidad indicada de cada insumo listado.
      </p>
    </div>
  );
}