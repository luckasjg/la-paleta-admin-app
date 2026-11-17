import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductMultiSelect from '@/components/products/ProductMultiSelect';
import { isTopping } from '@/lib/toppings';

// Sección del formulario de producto: toppings incluidos gratis por unidad.
export default function IncludedToppingsSection({ form, setForm, products }) {
  const count = form.included_toppings_count || 0;
  const ids = form.allowed_topping_ids || [];
  const [restricted, setRestricted] = React.useState(ids.length > 0);
  const toppings = products.filter(isTopping);
  const setMode = (r) => { setRestricted(r); if (!r) setForm({ ...form, allowed_topping_ids: [] }); };
  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
      <div>
        <Label>Toppings Incluidos en el Precio</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">Por unidad. Se pueden elegir en caja o completar en Despacho; los excedentes se cobran a su precio normal.</p>
      </div>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} max={10} className="w-20" value={count}
          onChange={e => setForm({ ...form, included_toppings_count: Math.max(0, parseInt(e.target.value) || 0) })} />
        <span className="text-sm text-muted-foreground">topping(s) incluidos por unidad</span>
      </div>
      {count > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {[[false, 'Todos los toppings'], [true, 'Lista específica']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => setMode(v)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${restricted === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}>
                {l}
              </button>
            ))}
          </div>
          {restricted
            ? <ProductMultiSelect products={toppings} value={ids} onChange={v => setForm({ ...form, allowed_topping_ids: v })} emptyText="No hay productos en la categoría adicional" />
            : <p className="text-[11px] text-muted-foreground">Se puede elegir cualquiera de los {toppings.length} toppings activos (categoría adicional).</p>}
        </div>
      )}
    </div>
  );
}