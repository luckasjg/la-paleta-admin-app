import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import PromotionFormDialog from '@/components/products/PromotionFormDialog';
import { DAY_LABELS, RULE_LABELS } from '@/lib/promotions';

function summary(p) {
  if (p.rule_type === 'direct_discount') return p.discount_mode === 'amount' ? `-$${(p.discount_value || 0).toFixed(2)} por unidad` : `-${p.discount_value || 0}% por unidad`;
  if (p.rule_type === 'quantity_bundle') {
    const m = [];
    if (p.bundle_percent > 0) m.push(`${p.bundle_percent}% al paquete`);
    if (p.extra_unit_percent > 0) m.push(`unidad extra al ${p.extra_unit_percent}%`);
    if (p.bundle_price > 0) m.push(`paquete a $${p.bundle_price.toFixed(2)}`);
    return `${p.min_quantity || 2} unidades · ${m.join(' o ')}`;
  }
  return `Compra ${p.min_quantity || 1} · ${p.reward_percent ?? 100}% en ${p.reward_product_ids?.length || 0} producto(s)`;
}

export default function PromotionsManager({ products }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null cerrado | {} nueva | promo
  const { data: promos = [], isLoading } = useQuery({ queryKey: ['promotions'], queryFn: () => base44.entities.Promotion.list('-created_date') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['promotions'] });
  const save = useMutation({
    mutationFn: (f) => (f.id ? base44.entities.Promotion.update(f.id, f) : base44.entities.Promotion.create(f)),
    onSuccess: () => { refresh(); setEditing(null); toast.success('Promoción guardada'); },
    onError: (e) => toast.error(e.message),
  });
  const toggle = useMutation({ mutationFn: (p) => base44.entities.Promotion.update(p.id, { active: !p.active }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id) => base44.entities.Promotion.delete(id), onSuccess: () => { refresh(); toast.success('Promoción eliminada'); } });
  const nameOf = (id) => products.find(p => p.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Se aplican solas en el POS. Si varias coinciden, gana la que más ahorra.</p>
        <Button onClick={() => setEditing({})}><Plus className="h-4 w-4 mr-2" /> Nueva promoción</Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Cargando promociones...</p>}
      {!isLoading && promos.length === 0 && (
        <Card className="p-12 flex flex-col items-center text-center">
          <Tag className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Aún no hay promociones</p>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {promos.map(p => (
          <Card key={p.id} className={`p-4 space-y-2 transition-opacity ${p.active === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{p.name}</p>
                <Badge variant="secondary" className="mt-1">{RULE_LABELS[p.rule_type]}</Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={p.active !== false} onCheckedChange={() => toggle.mutate(p)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
            <p className="text-sm">{summary(p)}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{(p.applicable_product_ids || []).map(nameOf).filter(Boolean).join(', ')}</p>
            <p className="text-[11px] text-muted-foreground">{p.days_of_week?.length ? p.days_of_week.slice().sort().map(d => DAY_LABELS[d]).join(' · ') : 'Todos los días'}</p>
          </Card>
        ))}
      </div>
      <PromotionFormDialog
        open={!!editing}
        promotion={editing?.id ? editing : null}
        products={products}
        saving={save.isPending}
        onSave={(f) => save.mutate(f)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}