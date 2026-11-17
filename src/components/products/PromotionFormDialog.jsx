import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ProductMultiSelect from '@/components/products/ProductMultiSelect';
import PromotionRuleFields from '@/components/products/PromotionRuleFields';
import { DAY_LABELS, RULE_LABELS } from '@/lib/promotions';

const EMPTY = {
  name: '', active: true, days_of_week: [], applicable_product_ids: [], rule_type: 'direct_discount',
  discount_mode: 'percent', discount_value: 10, min_quantity: 2, bundle_percent: 0, extra_unit_percent: 0,
  bundle_price: 0, reward_product_ids: [], reward_percent: 100,
};

export function promotionError(f) {
  if (!f.name.trim()) return 'Escribe un nombre';
  if (!f.applicable_product_ids.length) return 'Elige al menos un producto';
  if (f.rule_type === 'direct_discount' && !(f.discount_value > 0)) return 'Indica el descuento';
  if (f.rule_type === 'quantity_bundle' && !(f.bundle_percent > 0 || f.extra_unit_percent > 0 || f.bundle_price > 0)) return 'Configura al menos una modalidad del paquete';
  if (f.rule_type === 'buy_x_get_y' && !f.reward_product_ids.length) return 'Elige los productos de recompensa';
  return null;
}

export default function PromotionFormDialog({ open, promotion, products, saving, onSave, onClose }) {
  const [f, setF] = useState(EMPTY);
  useEffect(() => { if (open) setF({ ...EMPTY, ...(promotion || {}) }); }, [open, promotion]);
  const toggleDay = (d) => setF({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter(x => x !== d) : [...f.days_of_week, d] });
  const error = promotionError(f);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[92vw] sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6"><DialogTitle>{promotion ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
          <div><Label>Nombre</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ej: Promo 2 Merengadas" /></div>
          <div className="flex items-center gap-3"><Switch checked={f.active} onCheckedChange={v => setF({ ...f, active: v })} /><Label>Activa</Label></div>
          <div>
            <Label>Días</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {DAY_LABELS.map((l, d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${f.days_of_week.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}>{l}</button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{f.days_of_week.length ? 'Solo los días marcados' : 'Todos los días'}</p>
          </div>
          <div>
            <Label>Tipo de regla</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {Object.entries(RULE_LABELS).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setF({ ...f, rule_type: k })}
                  className={`rounded-md border px-2 py-2 text-xs font-medium leading-tight ${f.rule_type === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>{f.rule_type === 'buy_x_get_y' ? 'Productos que activan (compra X)' : 'Productos a los que aplica'}</Label>
            <div className="mt-1.5"><ProductMultiSelect products={products} value={f.applicable_product_ids} onChange={v => setF({ ...f, applicable_product_ids: v })} /></div>
          </div>
          <PromotionRuleFields f={f} setF={setF} products={products} />
        </div>
        <DialogFooter className="px-6 py-4 border-t items-center gap-2">
          {error && <span className="text-xs text-destructive mr-auto">{error}</span>}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!!error || saving} onClick={() => onSave(f)}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}