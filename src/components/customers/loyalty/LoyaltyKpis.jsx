import React from 'react';
import { TrendingUp, Gift } from 'lucide-react';

const Kpi = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}><Icon className="h-5 w-5" /></div>
    <div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  </div>
);

export default function LoyaltyKpis({ list, loading }) {
  const near = list.filter(x => x.st.status !== 'available' && x.st.pct >= 80).length;
  const ready = list.filter(x => x.st.status === 'available').length;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Kpi icon={TrendingUp} label="Cerca de su próximo beneficio (≥ 80 %)" value={loading ? '…' : near} tone="bg-primary/10 text-primary" />
      <Kpi icon={Gift} label="Beneficio disponible para canjear (100 %)" value={loading ? '…' : ready} tone="bg-emerald-100 text-emerald-700" />
    </div>
  );
}