import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wrench, Package } from 'lucide-react';

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
 *
 * props:
 *  - value: array de { supply_id, quantity, type }
 *  - onChange: (next) => void
 *  - supplies: catálogo completo de insumos
 */
export default function LinkedSuppliesEditor({ value = [], onChange, supplies = [] }) {
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
                <Select
                  value={line.supply_id || ''}
                  onValueChange={(v) => handleSupplyChange(idx, v)}
                >
                  <SelectTrigger className="text-sm h-8">
                    <SelectValue placeholder="Seleccionar insumo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({SECTOR_LABEL[s.sector] || s.sector} · {s.unit})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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