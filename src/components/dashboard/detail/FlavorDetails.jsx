import React from 'react';
import DetailTable, { money, num, pct } from './DetailTable';
import { BigBar, ChartBlock } from './DetailCharts';
import { pctDelta } from '@/lib/dashboardAnalytics';

const grams = (v) => `${Number(v || 0).toFixed(0)}g`;
const kg = (v) => `${(Number(v || 0) / 1000).toFixed(2)} kg`;

/** Variación vs mes anterior, en texto compacto y con color. */
function Delta({ current, previous }) {
  if (!previous) {
    return <span className="text-muted-foreground">nuevo</span>;
  }
  const d = pctDelta(current, previous);
  const up = d >= 0;
  return (
    <span className={up ? 'text-emerald-600' : 'text-destructive'}>
      {up ? '+' : ''}{d.toFixed(0)}%
    </span>
  );
}

/**
 * Ranking de sabores contabilizados INDIVIDUALMENTE: un helado de dos sabores
 * suma una aparición a cada sabor y reparte sus gramos reales.
 * Se muestran las dos métricas: veces pedido y gramos servidos.
 */
export function FlavorRankings({ analytics, monthLabel }) {
  const { byCount, byGrams, totalUnits, totalGrams } = analytics.month.flavors;
  const prevMap = Object.fromEntries(analytics.prev.flavors.byCount.map(f => [f.name, f]));

  const rows = byCount.map((f, i) => {
    const prev = prevMap[f.name];
    return {
      id: f.name,
      pos: i + 1,
      name: f.name,
      units: f.units,
      grams: f.grams,
      avgGrams: f.units > 0 ? f.grams / f.units : 0,
      revenue: f.revenue,
      share: totalUnits > 0 ? (f.units / totalUnits) * 100 : 0,
      prevUnits: prev?.units || 0,
    };
  });

  const topCount = byCount.slice(0, 15).map(f => ({ name: f.name, veces: f.units }));
  const topGrams = byGrams.slice(0, 15).map(f => ({ name: f.name, gramos: f.grams }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Sabores distintos', value: num(byCount.length) },
          { label: 'Sabores servidos (veces)', value: num(totalUnits) },
          { label: 'Helado servido', value: kg(totalGrams) },
          { label: 'Sabor #1', value: byCount[0] ? `${byCount[0].name} · ${num(byCount[0].units)}` : '—' },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-bold font-mono truncate" title={k.value}>{k.value}</p>
          </div>
        ))}
      </div>

      <ChartBlock title="Top 15 sabores por veces pedido" note={monthLabel}>
        <BigBar
          data={topCount}
          xKey="name"
          bars={[{ key: 'veces', name: 'Veces pedido' }]}
          horizontal
          valueFormat={num}
          showLabels
          height={Math.max(280, topCount.length * 30)}
        />
      </ChartBlock>

      <ChartBlock title="Top 15 sabores por gramos servidos" note={monthLabel}>
        <BigBar
          data={topGrams}
          xKey="name"
          bars={[{ key: 'gramos', name: 'Gramos servidos', color: 'hsl(28,60%,60%)' }]}
          horizontal
          valueFormat={grams}
          showLabels
          height={Math.max(280, topGrams.length * 30)}
        />
      </ChartBlock>

      <DetailTable
        title={`Sabores individuales (${rows.length}) — comparado con ${analytics.prev.label}`}
        columns={[
          { key: 'pos', label: '#' },
          { key: 'name', label: 'Sabor' },
          { key: 'units', label: 'Veces pedido', align: 'right', format: num },
          { key: 'prevUnits', label: 'Mes anterior', align: 'right', format: num },
          { key: 'delta', label: 'Variación', align: 'right', format: (_, row) => <Delta current={row.units} previous={row.prevUnits} /> },
          { key: 'grams', label: 'Gramos', align: 'right', format: grams },
          { key: 'avgGrams', label: 'Prom. por pedido', align: 'right', format: grams },
          { key: 'revenue', label: 'Ingreso atribuido', align: 'right', format: money },
          { key: 'share', label: '% de sabores', align: 'right', format: pct },
        ]}
        rows={rows}
        footer={{
          pos: '',
          name: 'Total',
          units: totalUnits,
          prevUnits: analytics.prev.flavors.totalUnits,
          grams: totalGrams,
          revenue: rows.reduce((s, r) => s + r.revenue, 0),
          share: 100,
        }}
      />
    </div>
  );
}

/**
 * Dato COMPLEMENTARIO: qué sabores gusta combinar a la gente. No sustituye el
 * ranking individual de arriba — aquí cada fila es una mezcla completa.
 */
export function CombinationsSection({ analytics, monthLabel }) {
  const combos = analytics.month.combinations;
  const prevMap = Object.fromEntries(analytics.prev.combinations.map(c => [c.name, c]));
  const totalCombos = combos.reduce((s, c) => s + c.units, 0);

  const rows = combos.map((c, i) => ({
    id: c.name,
    pos: i + 1,
    name: c.name,
    size: `${c.size} sabores`,
    units: c.units,
    prevUnits: prevMap[c.name]?.units || 0,
    revenue: c.revenue,
    share: totalCombos > 0 ? (c.units / totalCombos) * 100 : 0,
  }));

  const chartData = combos.slice(0, 12).map(c => ({ name: c.name, veces: c.units }));

  return (
    <div className="space-y-6 pt-2 border-t-2 border-dashed border-border">
      <div className="space-y-1 pt-4">
        <p className="text-sm font-bold">Combinaciones más pedidas</p>
        <p className="text-xs text-muted-foreground">
          Dato complementario: qué mezclas eligen los clientes. Cada fila es una
          combinación completa, no un sabor — el ranking oficial por sabor es el de arriba.
        </p>
      </div>

      {combos.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-border bg-secondary/30 p-4">
          En {monthLabel} no se vendieron helados de más de un sabor.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Combinaciones distintas', value: num(combos.length) },
              { label: 'Helados combinados', value: num(totalCombos) },
              { label: 'Mezcla favorita', value: combos[0] ? combos[0].name : '—' },
              { label: 'Top 3 concentra', value: pct(rows.slice(0, 3).reduce((s, r) => s + r.share, 0)) },
            ].map(k => (
              <div key={k.label} className="rounded-lg border border-border bg-accent/30 p-3">
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="text-sm font-bold truncate" title={k.value}>{k.value}</p>
              </div>
            ))}
          </div>

          <ChartBlock title="Top 12 combinaciones" note={monthLabel}>
            <BigBar
              data={chartData}
              xKey="name"
              bars={[{ key: 'veces', name: 'Veces pedida', color: 'hsl(270,50%,60%)' }]}
              horizontal
              valueFormat={num}
              showLabels
              height={Math.max(260, chartData.length * 30)}
            />
          </ChartBlock>

          <DetailTable
            title={`Combinaciones (${rows.length})`}
            columns={[
              { key: 'pos', label: '#' },
              { key: 'name', label: 'Combinación' },
              { key: 'size', label: 'Sabores' },
              { key: 'units', label: 'Veces pedida', align: 'right', format: num },
              { key: 'prevUnits', label: 'Mes anterior', align: 'right', format: num },
              { key: 'delta', label: 'Variación', align: 'right', format: (_, row) => <Delta current={row.units} previous={row.prevUnits} /> },
              { key: 'revenue', label: 'Ingresos', align: 'right', format: money },
              { key: 'share', label: '% de combos', align: 'right', format: pct },
            ]}
            rows={rows}
            footer={{
              pos: '',
              name: 'Total',
              units: totalCombos,
              revenue: rows.reduce((s, r) => s + r.revenue, 0),
              share: 100,
            }}
          />
        </>
      )}
    </div>
  );
}