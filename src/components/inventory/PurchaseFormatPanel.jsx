import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';

// Maps the purchase unit to (multiplier to base, base unit stored in DB)
export const PACKAGE_UNITS = [
  { value: 'kg', label: 'Kg', multiplier: 1000, baseUnit: 'g' },
  { value: 'g', label: 'Gramos (g)', multiplier: 1, baseUnit: 'g' },
  { value: 'l', label: 'Litros (L)', multiplier: 1000, baseUnit: 'ml' },
  { value: 'ml', label: 'Mililitros (ml)', multiplier: 1, baseUnit: 'ml' },
  { value: 'unidad', label: 'Unidades', multiplier: 1, baseUnit: 'unidad' },
];

export const getPackageUnit = (value) => PACKAGE_UNITS.find(u => u.value === value) || PACKAGE_UNITS[0];

export default function PurchaseFormatPanel({ purchase, setPurchase, form, setForm, lockUnit = false }) {
  const pkgUnit = getPackageUnit(purchase.package_unit);
  const price = parseFloat(purchase.purchase_price);
  const net = parseFloat(purchase.net_content);
  const baseTotal = net > 0 ? net * pkgUnit.multiplier : 0;
  const costPerBase = price > 0 && baseTotal > 0 ? price / baseTotal : 0;
  const presentation = (purchase.presentation || '').trim();
  const generatedLabel = presentation && net > 0
    ? `${presentation} de ${net} ${pkgUnit.label.replace(/\s*\(.*\)/, '')}`
    : '';

  // Recompute cost_per_unit (and normalize unit if not locked) whenever purchase format changes.
  // lockUnit=true → no sobrescribe form.unit (caso venta directa / utensilios donde la unidad
  // la elige el usuario manualmente y puede no coincidir con la del empaque).
  React.useEffect(() => {
    setForm(f => ({
      ...f,
      ...(lockUnit ? {} : { unit: pkgUnit.baseUnit }),
      cost_per_unit: costPerBase > 0 ? parseFloat(costPerBase.toFixed(6)) : f.cost_per_unit,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase.package_unit, purchase.purchase_price, purchase.net_content]);

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" /> Formato de Compra
      </p>

      <div>
        <Label className="text-xs">Presentación / Envase</Label>
        <Input
          placeholder="ej. Saco, Lata, Bolsa, Caja"
          value={purchase.presentation}
          onChange={e => setPurchase(p => ({ ...p, presentation: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Precio del Empaque ($)</Label>
          <Input
            type="number" step="0.01" placeholder="ej. 100"
            value={purchase.purchase_price}
            onChange={e => setPurchase(p => ({ ...p, purchase_price: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs">Contenido Neto</Label>
          <Input
            type="number" step="0.01" placeholder="ej. 25"
            value={purchase.net_content}
            onChange={e => setPurchase(p => ({ ...p, net_content: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Unidad del Empaque</Label>
        <Select
          value={purchase.package_unit}
          onValueChange={v => setPurchase(p => ({ ...p, package_unit: v }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PACKAGE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {baseTotal > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {generatedLabel && <><span className="font-semibold">{generatedLabel}</span> · </>}
            1 empaque = <span className="font-mono font-semibold">{baseTotal} {pkgUnit.baseUnit}</span>
            {costPerBase > 0 && <> · <span className="font-mono font-semibold">${costPerBase.toFixed(6)}/{pkgUnit.baseUnit}</span></>}
          </p>
        )}
      </div>
    </div>
  );
}