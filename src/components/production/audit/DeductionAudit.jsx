import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Wrench } from 'lucide-react';
import { compareDeductions } from '@/lib/deductionAudit';
import MovementsTable from '@/components/production/audit/MovementsTable';
import ApplyMissingDialog from '@/components/production/audit/ApplyMissingDialog';

const STATUS = {
  ok: { label: 'Inventario descontado ✓', cls: 'bg-green-100 text-green-700' },
  partial: { label: 'Descuento parcial ⚠️', cls: 'bg-amber-100 text-amber-800' },
  none: { label: 'Sin registro de descuento ⚠️', cls: 'bg-red-100 text-red-700' },
};
const f = (v) => (Number(v) || 0).toFixed(1);

export default function DeductionAudit({ refKey, label, expected, movements, bypass }) {
  const [open, setOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  if (bypass) return <Badge variant="outline" className="text-[10px]">Carga inicial · sin descuento</Badge>;
  const { rows, pending, status } = compareDeductions(expected, movements);
  const s = STATUS[status];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={s.cls}>{s.label}</Badge>
        <button type="button" onClick={() => setOpen(o => !o)} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          Ver movimientos de inventario <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {pending.length > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setApplyOpen(true)}>
            <Wrench className="h-3 w-3" /> Aplicar descuento faltante
          </Button>
        )}
      </div>
      {open && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          {rows.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Esperado vs. descontado</p>
              <div className="grid gap-1">
                {rows.map(r => (
                  <div key={r.supply_id} className="flex justify-between gap-2 text-xs">
                    <span className="truncate">{r.supply_name}</span>
                    <span className={`font-mono whitespace-nowrap ${r.diff > 0 ? 'text-amber-700 font-semibold' : 'text-muted-foreground'}`}>
                      {f(r.expected)} / {f(r.deducted)}{r.unit}{r.diff > 0 ? ` · falta ${f(r.diff)}` : ' ✓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <MovementsTable movements={movements} />
        </div>
      )}
      <ApplyMissingDialog open={applyOpen} onOpenChange={setApplyOpen} pending={pending} refKey={refKey} label={label} />
    </div>
  );
}