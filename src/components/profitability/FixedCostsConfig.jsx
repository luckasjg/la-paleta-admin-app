import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

export const DEFAULT_FIXED_COSTS = {
  cuchara: 0.05,
  servilletas: 0.02,
  cucharita_prueba: 0.01,
  otros: 0,
};

const FIELDS = [
  { key: 'cuchara', label: 'Cuchara' },
  { key: 'servilletas', label: 'Servilletas' },
  { key: 'cucharita_prueba', label: 'Cucharita de Prueba' },
  { key: 'otros', label: 'Otros' },
];

export default function FixedCostsConfig({ values, onChange }) {
  const total = Object.values(values).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  const update = (key, val) => {
    onChange({ ...values, [key]: parseFloat(val) || 0 });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Costos Fijos de Servicio
          <span className="font-normal text-muted-foreground text-xs ml-1">
            (se suman a cada venta para reflejar el costo real)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label} ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={values[f.key] ?? 0}
                onChange={e => update(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          ))}
          <div className="rounded-lg bg-secondary/60 px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground">Total Fijos</div>
            <div className="font-mono font-bold text-base">${total.toFixed(2)}</div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Los valores se guardan automáticamente en este dispositivo.
        </p>
      </CardContent>
    </Card>
  );
}