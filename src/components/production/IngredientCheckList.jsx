import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Repeat2, X } from 'lucide-react';
import { LOCATION_LABEL } from '@/lib/stockHelpers';

/**
 * Chequeo de insumos del diálogo de producción, con sustitución al vuelo:
 * si un insumo falta, permite elegir otro del inventario con la misma unidad
 * y stock suficiente en la ubicación origen.
 */
export default function IngredientCheckList({
  plan,
  sourceLocation,
  realCost,
  onSelectSubstitute,
  onClearSubstitute,
  onTogglePreferred,
}) {
  const missingCount = plan.filter((r) => r.missing).length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className={`px-3 py-2 flex items-center justify-between gap-2 text-sm font-medium ${
          missingCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'
        }`}
      >
        <span className="flex items-center gap-2">
          {missingCount > 0 ? (
            <><AlertTriangle className="h-4 w-4" /> Faltan {missingCount} insumo(s)</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Inventario suficiente</>
          )}
        </span>
        {plan.length > 0 && (
          <span className="text-xs font-mono opacity-80">Costo real: ${realCost.toFixed(2)}</span>
        )}
      </div>

      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {plan.map((row) => (
          <div key={row.index} className="px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`truncate ${row.missing ? 'text-destructive font-medium' : ''}`}>
                  {row.isSubstituted ? row.substitute.name : row.originalName}
                  {row.notFound && !row.isSubstituted && (
                    <span className="text-xs ml-1">(no encontrado)</span>
                  )}
                </p>
                {row.isSubstituted && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <Repeat2 className="h-3 w-3" /> Sustituye a {row.originalName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono">
                  Requiere: {row.needed.toFixed(1)}{row.unit}
                  {!row.isInfinite && row.effective && (
                    <> · Disponible: {row.available.toFixed(1)}{row.unit}</>
                  )}
                  {row.isInfinite && <> · (ilimitado)</>}
                </p>
              </div>

              {row.missing ? (
                <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15 flex-shrink-0">
                  Falta {Math.max(0, row.needed - row.available).toFixed(1)}{row.unit}
                </Badge>
              ) : row.isSubstituted ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-7 px-2 text-xs"
                  onClick={() => onClearSubstitute(row.index)}
                >
                  <X className="h-3 w-3 mr-1" /> Quitar
                </Button>
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}
            </div>

            {/* Selector de sustituto — sólo cuando el insumo falta */}
            {row.missing && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 space-y-2">
                {row.candidates.length > 0 ? (
                  <>
                    <Label className="text-xs text-amber-900">
                      Sustituir por otro insumo con stock en {LOCATION_LABEL[sourceLocation]}
                    </Label>
                    <Select
                      value={row.substitute?.id || ''}
                      onValueChange={(v) => onSelectSubstitute(row.index, v)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Elegir insumo sustituto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {row.candidates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} — {c.isInfinite ? 'ilimitado' : `${c.available.toFixed(1)}${c.unit}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <p className="text-xs text-amber-900">
                    No hay insumos en {LOCATION_LABEL[sourceLocation]} con la misma unidad ({row.unit || '—'})
                    y stock suficiente para sustituirlo.
                  </p>
                )}
              </div>
            )}

            {/* Guardar el sustituto como insumo por defecto de la receta */}
            {row.isSubstituted && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2">
                <Switch
                  id={`pref-${row.index}`}
                  checked={row.savePreferred}
                  onCheckedChange={(v) => onTogglePreferred(row.index, v)}
                />
                <Label htmlFor={`pref-${row.index}`} className="text-xs cursor-pointer leading-tight">
                  Guardar <b>{row.substitute.name}</b> como insumo preferido de esta receta
                </Label>
              </div>
            )}
          </div>
        ))}

        {plan.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            Esta receta no tiene ingredientes definidos.
          </p>
        )}
      </div>
    </div>
  );
}