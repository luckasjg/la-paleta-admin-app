import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { GROUPS } from '@/lib/inventoryAudit';
import FindingCard from '@/components/auditor/FindingCard';
import CorrectStockDialog from '@/components/auditor/CorrectStockDialog';
import { useAuditCorrections } from '@/components/auditor/useAuditCorrections';

const SEV_ORDER = { high: 0, medium: 1, low: 2 };

export default function FindingsList({ findings, loading }) {
  const [adjusting, setAdjusting] = useState(null);
  const [group, setGroup] = useState('residual');
  const { confirmZero, adjust, silence } = useAuditCorrections();
  const busy = confirmZero.isPending || silence.isPending;

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Auditando inventario…</p>;
  if (!findings.length) {
    return (
      <div className="py-14 text-center space-y-2">
        <ShieldCheck className="h-10 w-10 mx-auto text-emerald-600" />
        <p className="text-sm font-medium">Sin hallazgos</p>
        <p className="text-xs text-muted-foreground">El inventario no presenta anomalías detectables.</p>
      </div>
    );
  }

  const list = findings
    .filter(f => GROUPS.find(g => g.id === group).types.includes(f.type))
    .sort((a, b) => (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) || (b.sold || 0) - (a.sold || 0));

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {GROUPS.map(g => {
          const n = findings.filter(f => g.types.includes(f.type)).length;
          return (
            <button key={g.id} type="button" onClick={() => setGroup(g.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${group === g.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'}`}>
              {g.label} <span className="ml-1 opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nada en esta categoría</p>}
      <div className="space-y-2">
        {list.map(f => (
          <FindingCard key={f.key} finding={f} busy={busy}
            onZero={(x) => window.confirm(`¿Confirmar que "${x.name}" se agotó? Su stock quedará en 0 y se registrará el ajuste.`) && confirmZero.mutate({ supply_id: x.supply_id, finding_key: x.key })}
            onAdjust={setAdjusting}
            onSilence={(x) => silence.mutate({ supply_id: x.supply_id })} />
        ))}
      </div>
      <CorrectStockDialog finding={adjusting} open={!!adjusting} pending={adjust.isPending}
        onOpenChange={(o) => !o && setAdjusting(null)}
        onSubmit={(p) => adjust.mutate(p, { onSuccess: () => setAdjusting(null) })} />
    </div>
  );
}