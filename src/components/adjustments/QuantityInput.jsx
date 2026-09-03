import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Ruler } from 'lucide-react';

/**
 * Entrada de cantidad con soporte opcional de paquetes.
 * Emite siempre el valor en la UNIDAD BASE (g / ml / unidad), o null si está vacío.
 * Si el insumo no tiene package_format.net_content válido, sólo se muestra la unidad base.
 */
export default function QuantityInput({ unit = 'unidad', packageFormat, onChange, resetKey, label }) {
  const net = packageFormat?.net_content;
  const hasPkg = Number.isFinite(net) && net > 0;
  const pkgName = packageFormat?.presentation || packageFormat?.label || 'Paquetes';

  const [mode, setMode] = useState('base');
  const [base, setBase] = useState('');
  const [boxes, setBoxes] = useState('');
  const [loose, setLoose] = useState('');

  useEffect(() => {
    setMode('base');
    setBase('');
    setBoxes('');
    setLoose('');
  }, [resetKey]);

  useEffect(() => {
    if (mode === 'base' || !hasPkg) {
      onChange(base === '' ? null : (parseFloat(base) || 0));
    } else if (boxes === '' && loose === '') {
      onChange(null);
    } else {
      onChange((parseFloat(boxes) || 0) * net + (parseFloat(loose) || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, base, boxes, loose, net, hasPkg]);

  const pkgTotal = (parseFloat(boxes) || 0) * net + (parseFloat(loose) || 0);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {hasPkg && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode('base')}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-colors ${
              mode === 'base'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" /> En {unit}
          </button>
          <button
            type="button"
            onClick={() => setMode('package')}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-xs font-semibold border-2 transition-colors ${
              mode === 'package'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-secondary-foreground border-border'
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Por paquete
          </button>
        </div>
      )}

      {mode === 'base' || !hasPkg ? (
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={base}
          onChange={e => setBase(e.target.value)}
          placeholder={`Cantidad en ${unit}`}
          className="text-base"
        />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">{pkgName} completos</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={boxes}
                onChange={e => setBoxes(e.target.value)}
                placeholder="0"
                className="text-base"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sueltos ({unit})</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={loose}
                onChange={e => setLoose(e.target.value)}
                placeholder="0"
                className="text-base"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            1 {pkgName} = {net} {unit} · Total: {pkgTotal.toFixed(2)} {unit}
          </p>
        </div>
      )}
    </div>
  );
}