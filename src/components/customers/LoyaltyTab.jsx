import React from 'react';
import moment from 'moment';
import { useShopSetting } from '@/lib/useShopSetting';
import { LOYALTY_KEY, LEVEL_POINTS, parseRules, computeLoyalty } from '@/lib/loyalty';
import { formatEUR, formatUSD } from '@/lib/useExchangeRate';
import { Stat } from '@/components/customers/CustomerHistoryTab';
import { Progress } from '@/components/ui/progress';

export default function LoyaltyTab({ data }) {
  const { value, isLoading } = useShopSetting(LOYALTY_KEY);
  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>;
  const rules = parseRules(value);
  const l = computeLoyalty(data.entries, rules);
  const base = l.unlockedLevels * LEVEL_POINTS;
  const progress = Math.min(100, ((Math.min(l.paidPoints, l.nextTarget) - base) / LEVEL_POINTS) * 100);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6">
        <p className="text-xs uppercase tracking-widest opacity-80">Puntos válidos (pagados)</p>
        <p className="text-4xl font-bold mt-1">{l.paidPoints}</p>
        <p className="text-xs opacity-80 mt-1">{l.points} acumulados · {l.pendingPoints} pendientes por deuda</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Beneficios liberados" value={l.unlockedLevels} />
        <Stat label="Beneficios bloqueados" value={l.lockedLevels} />
        <Stat label="Visitas" value={l.visits} />
        <Stat label="Consumo acumulado" value={formatEUR(l.spent)} />
      </div>
      <div className="rounded-xl border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Próximo beneficio</span>
          <span className="font-mono">{Math.max(base, Math.min(l.paidPoints, l.nextTarget))} / {l.nextTarget}</span>
        </div>
        <Progress value={Math.max(0, progress)} />
      </div>
      {l.blockers.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Deudas a saldar para liberar el siguiente beneficio</p>
          {l.blockers.map(b => (
            <div key={b.id} className="flex justify-between text-xs text-amber-900">
              <span>Compra del {moment(b.date).format('DD/MM/YYYY')} · {b.pts} pts</span>
              <span className="font-mono">Debe {formatUSD(b.credit?.balance || 0)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Regla: 1 punto por cada $ de compra; visita desde {formatEUR(rules.min_visit_eur)}. Los puntos de ventas a crédito solo valen pagados: el primer beneficio exige {LEVEL_POINTS} puntos pagados y los siguientes exigen saldar las compras que los generaron.</p>
    </div>
  );
}