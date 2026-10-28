import React from 'react';
import { useShopSetting } from '@/lib/useShopSetting';
import { LOYALTY_KEY, parseRules, computeLoyalty } from '@/lib/loyalty';
import { formatEUR } from '@/lib/useExchangeRate';
import { Stat } from '@/components/customers/CustomerHistoryTab';

export default function LoyaltyTab({ data }) {
  const { value, isLoading } = useShopSetting(LOYALTY_KEY);
  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>;
  const rules = parseRules(value);
  const l = computeLoyalty(data.entries, rules);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary text-primary-foreground p-6">
        <p className="text-xs uppercase tracking-widest opacity-80">Saldo de puntos</p>
        <p className="text-4xl font-bold mt-1">{l.points}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Visitas" value={l.visits} />
        <Stat label="Consumo acumulado" value={formatEUR(l.spent)} />
      </div>
      <p className="text-xs text-muted-foreground">Regla: {rules.points_per_eur} punto(s) por €; visita desde {formatEUR(rules.min_visit_eur)}. Excluye ventas anuladas y pedidos cancelados.</p>
    </div>
  );
}