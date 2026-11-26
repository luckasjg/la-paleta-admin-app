import React from 'react';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { getStockTotal } from '@/lib/stockHelpers';
import { fmtQty, residualThreshold } from '@/lib/inventoryAudit';

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-muted/60 px-3 py-2">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

export default function SupplyAuditDetail({ supply: s, findings, onBack }) {
  const mine = findings.filter(f => f.supply_id === s.id);
  const { data: moves = [], isLoading } = useQuery({
    queryKey: ['auditor_supply_moves', s.id],
    queryFn: async () => (await base44.entities.InventoryAdjustment.filter(
      { $or: [{ supply_id: s.id }, { reference_id: s.id }] }, { sort: '-created_date', limit: 15 })).items,
  });
  const u = s.unit;

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" className="-ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Volver a resultados</Button>
      <div>
        <h3 className="text-lg font-semibold leading-tight">{s.name}</h3>
        <p className="text-xs text-muted-foreground break-all">Código: {s.id}</p>
        <p className="text-xs text-muted-foreground">{s.category || 'Sin categoría'}{s.supplier ? ` · ${s.supplier}` : ''}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Stock total" value={s.is_infinite ? 'Infinito' : `${fmtQty(getStockTotal(s))} ${u}`} />
        <Stat label="Almacén" value={`${fmtQty(s.stock_warehouse)} ${u}`} />
        <Stat label="Producción" value={`${fmtQty(s.stock_production)} ${u}`} />
        <Stat label="Stock mínimo" value={`${fmtQty(s.stock_minimum)} ${u}`} />
        <Stat label="Umbral residual" value={`${fmtQty(residualThreshold(s))} ${u}`} />
        <Stat label="Costo por unidad" value={`$${(Number(s.cost_per_unit) || 0).toFixed(4)}`} />
      </div>
      {s.ignore_overstock_alert && <p className="text-xs text-muted-foreground">Alertas de sobreexistencia silenciadas.</p>}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Hallazgos ({mine.length})</h4>
        {!mine.length && <p className="text-xs text-muted-foreground">Sin hallazgos para este insumo.</p>}
        {mine.map(f => (
          <div key={f.key} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div><p className="text-sm font-medium">{f.title}</p><p className="text-xs text-muted-foreground">{f.detail}</p></div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Últimos movimientos</h4>
        {isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
        {!isLoading && !moves.length && <p className="text-xs text-muted-foreground">Sin movimientos registrados.</p>}
        <div className="divide-y divide-border rounded-lg border border-border">
          {moves.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{m.reference_label || m.reason}</p>
                <p className="text-[11px] text-muted-foreground">{moment(m.created_date).format('DD/MM/YY HH:mm')}{m.location ? ` · ${m.location === 'warehouse' ? 'Almacén' : 'Producción'}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${m.quantity_change < 0 ? 'text-destructive' : 'text-emerald-700'}`}>{m.quantity_change > 0 ? '+' : ''}{fmtQty(m.quantity_change)} {m.unit || u}</p>
                {m.stock_after != null && <p className="text-[11px] text-muted-foreground">Saldo {fmtQty(m.stock_after)}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}