import React from 'react';
import DetailTable, { money, num, pct } from './DetailTable';
import { BigBar, BigLine, BigPie, ChartBlock } from './DetailCharts';
import { FlavorRankings, CombinationsSection } from './FlavorDetails';

/**
 * Ranking COMPLETO del mes (no sólo el top 8 de la tarjeta). Los sabores ya
 * vienen contabilizados individualmente: un helado de dos sabores suma a cada
 * uno por separado, nunca como una entrada “Sabor A + Sabor B”.
 */
export function ProductsDetail({ analytics, monthLabel }) {
  const products = analytics.month.products;
  const totalUnits = products.reduce((s, p) => s + p.units, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  const rows = products.map((p, i) => ({
    id: `${p.name}-${i}`,
    pos: i + 1,
    name: p.name,
    units: p.units,
    revenue: p.revenue,
    avg: p.units > 0 ? p.revenue / p.units : 0,
    share: totalUnits > 0 ? (p.units / totalUnits) * 100 : 0,
  }));

  const chartData = products.slice(0, 15).map(p => ({ name: p.name, ventas: p.units }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Productos distintos', value: num(products.length) },
          { label: 'Unidades vendidas', value: num(totalUnits) },
          { label: 'Ingreso de ítems', value: money(totalRevenue) },
          { label: 'Top 5 concentra', value: pct(rows.slice(0, 5).reduce((s, r) => s + r.share, 0)) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground -mt-3">
        Cada sabor se cuenta de forma individual: un helado de varios sabores suma
        una unidad a cada sabor que lo compone.
      </p>
      <ChartBlock title="Top 15 por unidades" note={monthLabel}>
        <BigBar
          data={chartData}
          xKey="name"
          bars={[{ key: 'ventas', name: 'Unidades' }]}
          horizontal
          valueFormat={num}
          showLabels
          height={Math.max(280, chartData.length * 30)}
        />
      </ChartBlock>
      <DetailTable
        title={`Ranking completo (${rows.length})`}
        columns={[
          { key: 'pos', label: '#' },
          { key: 'name', label: 'Producto / Sabor' },
          { key: 'units', label: 'Unidades', align: 'right', format: num },
          { key: 'revenue', label: 'Ingresos', align: 'right', format: money },
          { key: 'avg', label: 'Precio prom.', align: 'right', format: money },
          { key: 'share', label: '% unidades', align: 'right', format: pct },
        ]}
        rows={rows}
        footer={{ pos: '', name: 'Total', units: totalUnits, revenue: totalRevenue, share: 100 }}
      />

      <div className="pt-4 border-t-2 border-border space-y-1">
        <p className="text-sm font-bold">Ranking por sabor</p>
        <p className="text-xs text-muted-foreground">
          Sólo helados, con las dos métricas: veces pedido y gramos servidos.
        </p>
      </div>
      <FlavorRankings analytics={analytics} monthLabel={monthLabel} />

      <CombinationsSection analytics={analytics} monthLabel={monthLabel} />
    </div>
  );
}

/** Métodos de pago: torta grande, montos acumulados y ticket promedio por vía. */
export function PaymentsDetail({ analytics, monthLabel }) {
  const payments = analytics.month.payments;
  const totalCount = payments.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Vías utilizadas', value: num(payments.length) },
          { label: 'Método dominante', value: payments[0] ? `${payments[0].name} (${pct(payments[0].pct)})` : '—' },
          { label: 'Total cobrado', value: money(analytics.month.revenue) },
          { label: 'Transacciones', value: num(totalCount) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-bold truncate" title={k.value}>{k.value}</p>
          </div>
        ))}
      </div>
      <ChartBlock title="Distribución del cobro" note={monthLabel}>
        <BigPie data={payments} />
      </ChartBlock>
      <ChartBlock title="Monto acumulado por vía">
        <BigBar data={payments} xKey="name" bars={[{ key: 'value', name: 'Monto' }]} showLabels height={300} />
      </ChartBlock>
      <DetailTable
        title="Acumulado por método de pago"
        columns={[
          { key: 'name', label: 'Método' },
          { key: 'count', label: 'Transacciones', align: 'right', format: num },
          { key: 'value', label: 'Monto', align: 'right', format: money },
          { key: 'avg', label: 'Ticket prom.', align: 'right', format: money },
          { key: 'pct', label: '% del total', align: 'right', format: pct },
        ]}
        rows={payments.map(p => ({ ...p, id: p.key }))}
        footer={{ name: 'Total', count: totalCount, value: analytics.month.revenue, pct: 100 }}
      />
    </div>
  );
}

/** Ventas por hora con desglose por turno. */
export function HourlyDetail({ analytics, monthLabel }) {
  const hourly = analytics.month.hourly.filter(h => h.count > 0 || (h.hour >= 8 && h.hour <= 21));
  const revenue = analytics.month.revenue;
  const rows = hourly.map(h => ({
    id: h.hora,
    hora: h.hora,
    turno: h.hour < 12 ? 'Mañana' : h.hour < 18 ? 'Tarde' : 'Noche',
    count: h.count,
    ventas: h.ventas,
    ticket: h.count > 0 ? h.ventas / h.count : 0,
    share: revenue > 0 ? (h.ventas / revenue) * 100 : 0,
  }));
  const peak = [...rows].sort((a, b) => b.ventas - a.ventas)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Hora pico', value: peak ? `${peak.hora} · ${money(peak.ventas)}` : '—' },
          ...analytics.month.shifts.map(s => ({ label: `Turno ${s.name}`, value: `${money(s.ventas)} (${pct(s.pct)})` })),
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-bold font-mono truncate" title={k.value}>{k.value}</p>
          </div>
        ))}
      </div>
      <ChartBlock title="Ingresos por hora" note={monthLabel}>
        <BigLine data={rows} xKey="hora" lines={[{ key: 'ventas', name: 'Ingresos' }]} height={340} />
      </ChartBlock>
      <DetailTable
        title="Desglose por turno"
        columns={[
          { key: 'name', label: 'Turno' },
          { key: 'count', label: 'Transacciones', align: 'right', format: num },
          { key: 'ventas', label: 'Ingresos', align: 'right', format: money },
          { key: 'pct', label: '% del mes', align: 'right', format: pct },
        ]}
        rows={analytics.month.shifts.map(s => ({ ...s, id: s.name }))}
        footer={{ name: 'Total', count: analytics.month.count, ventas: revenue, pct: 100 }}
      />
      <DetailTable
        title="Detalle hora por hora"
        columns={[
          { key: 'hora', label: 'Hora' },
          { key: 'turno', label: 'Turno' },
          { key: 'count', label: 'Tickets', align: 'right', format: num },
          { key: 'ventas', label: 'Ingresos', align: 'right', format: money },
          { key: 'ticket', label: 'Ticket prom.', align: 'right', format: money },
          { key: 'share', label: '% del mes', align: 'right', format: pct },
        ]}
        rows={rows}
      />
    </div>
  );
}

/** Ventas por día de la semana, con promedio por ocurrencia. */
export function WeekdayDetail({ analytics, monthLabel }) {
  const revenue = analytics.month.revenue;
  const rows = analytics.month.weekday.map(d => ({
    ...d,
    id: d.name,
    ticket: d.count > 0 ? d.ventas / d.count : 0,
    share: revenue > 0 ? (d.ventas / revenue) * 100 : 0,
  }));
  const best = [...rows].sort((a, b) => b.avgPerDay - a.avgPerDay)[0];
  const worst = [...rows].filter(r => r.occurrences > 0).sort((a, b) => a.avgPerDay - b.avgPerDay)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Mejor día (promedio)', value: best ? `${best.name} · ${money(best.avgPerDay)}` : '—' },
          { label: 'Día más flojo', value: worst ? `${worst.name} · ${money(worst.avgPerDay)}` : '—' },
          { label: 'Fin de semana', value: pct(rows.filter(r => ['Sáb', 'Dom'].includes(r.name)).reduce((s, r) => s + r.share, 0)) },
          { label: 'Total del mes', value: money(revenue) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-bold font-mono truncate" title={k.value}>{k.value}</p>
          </div>
        ))}
      </div>
      <ChartBlock title="Ingresos acumulados y promedio por día de semana" note={monthLabel}>
        <BigBar
          data={rows}
          xKey="name"
          bars={[
            { key: 'ventas', name: 'Acumulado' },
            { key: 'avgPerDay', name: 'Promedio por ocurrencia' },
          ]}
          height={320}
        />
      </ChartBlock>
      <DetailTable
        title="Detalle por día de la semana"
        columns={[
          { key: 'name', label: 'Día' },
          { key: 'occurrences', label: 'Veces en el mes', align: 'right', format: num },
          { key: 'count', label: 'Tickets', align: 'right', format: num },
          { key: 'ventas', label: 'Acumulado', align: 'right', format: money },
          { key: 'avgPerDay', label: 'Promedio', align: 'right', format: money },
          { key: 'ticket', label: 'Ticket prom.', align: 'right', format: money },
          { key: 'share', label: '% del mes', align: 'right', format: pct },
        ]}
        rows={rows}
        footer={{ name: 'Total', count: analytics.month.count, ventas: revenue, share: 100 }}
      />
    </div>
  );
}