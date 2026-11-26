import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RankingRow from '@/components/customers/loyalty/RankingRow';

export default function LoyaltyRanking({ list, loading, onOpen }) {
  const [tab, setTab] = useState('near');
  const [all, setAll] = useState(false);
  const rows = (tab === 'ready'
    ? list.filter(x => x.st.status === 'available')
    : list.filter(x => x.st.status !== 'available' && x.st.pct > 0 && (all || x.st.pct >= 75)))
    .sort((a, b) => b.st.pct - a.st.pct || b.st.points - a.st.points);
  const shown = all ? rows : rows.slice(0, 10);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
        <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Próximos a Beneficio o Nivel</h3>
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setAll(false); }}>
          <TabsList className="h-8">
            <TabsTrigger value="near" className="text-xs">75 % – 99 %</TabsTrigger>
            <TabsTrigger value="ready" className="text-xs">Listos 100 %</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {loading ? <p className="p-6 text-center text-sm text-muted-foreground">Calculando avance de fidelización…</p> :
        !shown.length ? <p className="p-6 text-center text-sm text-muted-foreground">No hay clientes en este grupo.</p> :
        <div className="divide-y">{shown.map((x, i) => <RankingRow key={x.c.id} rank={i + 1} customer={x.c} standing={x.st} onOpen={onOpen} />)}</div>}
      {!loading && (rows.length > 10 || all || tab === 'near') && (
        <div className="px-4 py-2 border-t text-center">
          <Button size="sm" variant="ghost" onClick={() => setAll(!all)}>{all ? 'Ver menos' : 'Ver todos'}</Button>
        </div>
      )}
    </div>
  );
}