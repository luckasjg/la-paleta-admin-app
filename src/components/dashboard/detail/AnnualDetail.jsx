import React from 'react';
import DetailTable, { money, num, pct } from './DetailTable';
import { BigBar, ChartBlock } from './DetailCharts';
import { pctDelta } from '@/lib/dashboardAnalytics';

/** Serie anual mes a mes con comparación contra el año anterior. */
export default function AnnualDetail({ analytics, selectedYear }) {
  const { annual, prevAnnual, yearTotal, prevYearTotal } = analytics;

  const chartData = annual.map((m, i) => ({
    name: m.name,
    actual: m.ventas,
    anterior: prevAnnual[i].ventas,
  }));

  const rows = annual.map((m, i) => ({
    id: m.name,
    mes: m.fullName,
    transacciones: m.transacciones,
    ventas: m.ventas,
    avgTicket: m.avgTicket,
    anterior: prevAnnual[i].ventas,
    variacion: pctDelta(m.ventas, prevAnnual[i].ventas),
    share: yearTotal > 0 ? (m.ventas / yearTotal) * 100 : 0,
  }));

  const activeMonths = annual.filter(m => m.ventas > 0);
  const best = [...annual].sort((a, b) => b.ventas - a.ventas)[0];
  const totalTx = annual.reduce((s, m) => s + m.transacciones, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `Total ${selectedYear}`, value: money(yearTotal) },
          { label: `Total ${selectedYear - 1}`, value: money(prevYearTotal) },
          { label: 'Variación interanual', value: `${pctDelta(yearTotal, prevYearTotal) >= 0 ? '+' : ''}${pctDelta(yearTotal, prevYearTotal).toFixed(1)}%` },
          { label: 'Promedio por mes activo', value: money(activeMonths.length > 0 ? yearTotal / activeMonths.length : 0) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        Mejor mes del año: <strong className="text-foreground">{best?.fullName}</strong> con{' '}
        <span className="font-mono font-semibold text-primary">{money(best?.ventas)}</span> en{' '}
        {num(best?.transacciones)} transacciones · {num(activeMonths.length)} meses con actividad.
      </div>

      <ChartBlock title={`Ventas mensuales ${selectedYear} vs. ${selectedYear - 1}`}>
        <BigBar
          data={chartData}
          xKey="name"
          bars={[
            { key: 'actual', name: String(selectedYear) },
            { key: 'anterior', name: String(selectedYear - 1) },
          ]}
          height={360}
        />
      </ChartBlock>

      <DetailTable
        title={`Detalle mes a mes ${selectedYear}`}
        columns={[
          { key: 'mes', label: 'Mes' },
          { key: 'transacciones', label: 'Tickets', align: 'right', format: num },
          { key: 'ventas', label: 'Ingresos', align: 'right', format: money },
          { key: 'avgTicket', label: 'Ticket prom.', align: 'right', format: money },
          { key: 'anterior', label: `${selectedYear - 1}`, align: 'right', format: money },
          { key: 'variacion', label: 'Variación', align: 'right', format: (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` },
          { key: 'share', label: '% del año', align: 'right', format: pct },
        ]}
        rows={rows}
        footer={{ mes: 'Total', transacciones: totalTx, ventas: yearTotal, anterior: prevYearTotal, share: 100 }}
      />
    </div>
  );
}