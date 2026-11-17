import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductMultiSelect from '@/components/products/ProductMultiSelect';

const Num = ({ label, value, onChange, hint, step = '1' }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Input type="number" min={0} step={step} value={value ?? 0} onChange={e => onChange(parseFloat(e.target.value) || 0)} />
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

// Parámetros según el tipo de regla de la promoción.
export default function PromotionRuleFields({ f, setF, products }) {
  const set = (k) => (v) => setF({ ...f, [k]: v });
  if (f.rule_type === 'direct_discount') {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
        <div className="flex gap-1.5">
          {[['percent', 'Porcentaje %'], ['amount', 'Monto fijo $']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setF({ ...f, discount_mode: k })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium ${f.discount_mode === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}>{l}</button>
          ))}
        </div>
        <Num label={f.discount_mode === 'amount' ? 'Descuento por unidad ($ base)' : 'Descuento por unidad (%)'} step="0.01"
          value={f.discount_value} onChange={set('discount_value')} />
      </div>
    );
  }
  if (f.rule_type === 'quantity_bundle') {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
        <Num label="Unidades por paquete" value={f.min_quantity} onChange={v => setF({ ...f, min_quantity: Math.max(2, Math.round(v)) })} />
        <p className="text-[11px] text-muted-foreground">Configura una o varias modalidades (deja en 0 las que no uses). Si hay varias, se aplica la que más ahorre al cliente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Num label="% al paquete" value={f.bundle_percent} onChange={set('bundle_percent')} />
          <Num label="% a la unidad extra" value={f.extra_unit_percent} onChange={set('extra_unit_percent')} hint="Ej. 50 = 2da al 50%" />
          <Num label="Precio fijo ($ base)" step="0.01" value={f.bundle_price} onChange={set('bundle_price')} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Num label="Unidades a comprar (X)" value={f.min_quantity} onChange={v => setF({ ...f, min_quantity: Math.max(1, Math.round(v)) })} />
        <Num label="% de descuento en la recompensa" value={f.reward_percent} onChange={v => setF({ ...f, reward_percent: Math.min(100, v) })} hint="100 = gratis" />
      </div>
      <div>
        <Label className="text-xs">Productos de recompensa (Y)</Label>
        <div className="mt-1.5"><ProductMultiSelect products={products} value={f.reward_product_ids} onChange={set('reward_product_ids')} /></div>
      </div>
    </div>
  );
}