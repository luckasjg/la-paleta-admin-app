import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import SearchableCombobox from '@/components/shared/SearchableCombobox';

/** Paso 2 — Variegados / inclusiones reales del lote (receta + adicionales). */
export default function VariegatosPanel({ lines, supplies, onChangeQty, onAddExtra, onRemoveExtra }) {
  const options = supplies
    .filter((s) => s.sector === 'materia_prima')
    .map((s) => ({ value: s.id, label: s.name, sublabel: `(${s.unit})` }));

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/50 text-sm font-medium">Paso 2 · Variegados / Inclusiones</div>
      <div className="divide-y divide-border">
        {lines.map((l) => (
          <div key={l.key} className="px-3 py-2 text-sm flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate">{l.name}{l.isExtra && <span className="text-xs text-muted-foreground ml-1">(adicional)</span>}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {!l.isExtra && <>Sugerido: {l.planned.toFixed(1)}{l.unit} · </>}
                {l.isInfinite ? 'ilimitado' : `Disp: ${l.available.toFixed(1)}${l.unit}`}
              </p>
            </div>
            {l.missing && <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">Sin stock</Badge>}
            <Input
              type="number" min="0" className="h-8 w-24 text-right text-xs"
              value={l.quantity}
              onChange={(e) => onChangeQty(l.key, parseFloat(e.target.value) || 0)}
            />
            <span className="text-xs text-muted-foreground w-8">{l.unit}</span>
            {l.isExtra && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveExtra(l.key)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {lines.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Esta receta no tiene variegados.</p>}
        <div className="px-3 py-2">
          <SearchableCombobox
            value=""
            onChange={onAddExtra}
            options={options}
            placeholder="Agregar variegado adicional..."
            searchPlaceholder="Buscar insumo..."
            emptyText="Sin insumos"
          />
        </div>
      </div>
    </div>
  );
}