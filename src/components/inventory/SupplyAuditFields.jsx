import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScanSearch } from 'lucide-react';
import { defaultResidualThreshold } from '@/lib/inventoryAudit';

export default function SupplyAuditFields({ form, setForm, unit }) {
  const def = defaultResidualThreshold({ ...form, unit });
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <p className="text-sm font-medium flex items-center gap-1.5"><ScanSearch className="h-4 w-4 text-primary" /> Auditor de Inventario</p>
      <div>
        <Label className="text-xs">Umbral residual ({unit})</Label>
        <Input type="number" min="0" step="any" className="mt-1" placeholder={`${def} (por defecto)`}
          value={form.residual_threshold ?? ''} onChange={e => setForm(f => ({ ...f, residual_threshold: e.target.value }))} />
        <p className="text-[10px] text-muted-foreground mt-1">Si el saldo queda en este valor o menos, el Auditor pregunta si el empaque se agotó.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">Silenciar alertas de sobreexistencia</p>
          <p className="text-[10px] text-muted-foreground">Para insumos estacionales o de baja rotación</p>
        </div>
        <Switch checked={!!form.ignore_overstock_alert} onCheckedChange={v => setForm(f => ({ ...f, ignore_overstock_alert: v }))} />
      </div>
    </div>
  );
}