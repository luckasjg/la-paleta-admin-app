import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Ban, CheckCircle2, Repeat2, Undo2, X } from 'lucide-react';
import { LOCATION_LABEL } from '@/lib/stockHelpers';

export default function IngredientRow({ row, sourceLocation, onSelectSubstitute, onClearSubstitute, onTogglePreferred, onVariation }) {
  const v = row.variation;
  const omitted = v?.status === 'omitted';
  const adjusted = v?.status === 'adjusted';
  const name = row.isSubstituted ? row.substitute.name : row.originalName;

  return (
    <div className="px-3 py-2 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`truncate ${omitted ? 'line-through text-muted-foreground' : ''} ${row.missing ? 'text-destructive font-medium' : ''}`}>
            {name}
            {row.notFound && !row.isSubstituted && <span className="text-xs ml-1">(no encontrado)</span>}
          </p>
          {row.isSubstituted && (
            <p className="text-xs text-amber-700 flex items-center gap-1"><Repeat2 className="h-3 w-3" /> Sustituye a {row.originalName}</p>
          )}
          <p className="text-xs text-muted-foreground font-mono">
            Plan: {row.planned.toFixed(1)}{row.unit}
            {(omitted || adjusted) && <> · Real: {row.needed.toFixed(1)}{row.unit}</>}
            {!row.isInfinite && row.effective && <> · Disp: {row.available.toFixed(1)}{row.unit}</>}
            {row.isInfinite && <> · (ilimitado)</>}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {omitted && <Badge variant="secondary">Omitido (0 {row.unit})</Badge>}
          {adjusted && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Ajustado</Badge>}
          {row.missing && (
            <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
              Falta {Math.max(0, row.needed - row.available).toFixed(1)}{row.unit}
            </Badge>
          )}
          {!row.missing && !v && !row.isSubstituted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button" size="sm" variant={omitted ? 'secondary' : 'outline'} className="h-7 px-2 text-xs"
          onClick={() => onVariation(row.index, omitted ? null : { status: 'omitted', actual_quantity: 0, reason: v?.reason || '' })}
        >
          {omitted ? <><Undo2 className="h-3 w-3 mr-1" /> Usar</> : <><Ban className="h-3 w-3 mr-1" /> Omitir</>}
        </Button>
        {!omitted && (
          <div className="flex items-center gap-1">
            <Input
              type="number" className="h-7 w-24 text-xs text-right"
              value={adjusted ? v.actual_quantity : ''}
              placeholder={row.planned.toFixed(1)}
              onChange={(e) => onVariation(row.index, e.target.value === ''
                ? null
                : { status: 'adjusted', actual_quantity: parseFloat(e.target.value) || 0, reason: v?.reason || '' })}
            />
            <span className="text-xs text-muted-foreground">{row.unit} reales</span>
          </div>
        )}
        {row.isSubstituted && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onClearSubstitute(row.index)}>
            <X className="h-3 w-3 mr-1" /> Quitar sustituto
          </Button>
        )}
      </div>

      {v && (
        <Input
          className="h-7 text-xs" placeholder="Motivo (opcional)"
          value={v.reason || ''}
          onChange={(e) => onVariation(row.index, { ...v, reason: e.target.value })}
        />
      )}

      {row.missing && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 space-y-2">
          {row.candidates.length > 0 ? (
            <>
              <Label className="text-xs text-amber-900">Sustituir por otro insumo con stock en {LOCATION_LABEL[sourceLocation]}</Label>
              <Select value={row.substitute?.id || ''} onValueChange={(val) => onSelectSubstitute(row.index, val)}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Elegir insumo sustituto..." /></SelectTrigger>
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
              No hay insumos en {LOCATION_LABEL[sourceLocation]} con la misma unidad ({row.unit || '—'}) y stock suficiente para sustituirlo.
            </p>
          )}
        </div>
      )}

      {row.isSubstituted && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
          <Switch id={`pref-${row.index}`} checked={row.savePreferred} onCheckedChange={(val) => onTogglePreferred(row.index, val)} />
          <Label htmlFor={`pref-${row.index}`} className="text-xs cursor-pointer leading-tight">
            Guardar <b>{row.substitute.name}</b> como insumo preferido de esta receta
          </Label>
        </div>
      )}
    </div>
  );
}