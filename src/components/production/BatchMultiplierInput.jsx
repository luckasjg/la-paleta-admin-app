import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const QUICK = [0.5, 1, 1.5, 2];

export default function BatchMultiplierInput({ value, onChange, quick = QUICK, label = 'Paso 1 · Multiplicador de lote', hint = 'Escala la mezcla base y los variegados de la receta.' }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {quick.map((q) => (
          <Button key={q} type="button" size="sm" variant={value === q ? 'default' : 'outline'} className="h-8 px-3" onClick={() => onChange(q)}>
            {q}x
          </Button>
        ))}
        <Input
          type="number" step="0.01" min="0" className="h-8 w-24"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}