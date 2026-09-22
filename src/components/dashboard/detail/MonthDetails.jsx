import React from 'react';
import DetailTable, { money, num, pct } from './DetailTable';
import ComparisonGrid from './ComparisonGrid';
import { BigBar, BigLine, ChartBlock } from './DetailCharts';

/** KPIs del mes: curva diaria, comparación con el mes anterior y ranking. */
export function MonthKpiDetail({ analytics, monthLabel }) {
  const { month, prev, byDay, activeDays, bestDay, avgPerActiveDay } = analytics;

  return (
    <div className="space-y-6">
      <ComparisonGrid
        title={`Resumen de ${monthLabel}`}
        referenceLabel={prev.label}
        rows={[
          { label: 'Total vendido', current: month.revenue, previous: prev.revenue, format: money },
          { label: 'Transacciones', current: month.count, previous: prev.count, format: num },
          { label: 'Ticket promedio', current: month.avgTicket, previous: prev.avgTicket, format: money },
          { label: 'Unidades vendidas', current: month.units, previous: prev.units, format: num },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Días con ventas', value: num(activeDays) },
          { label: 'Promedio por día activo', value: money(avgPerActiveDay) },
          { label: 'Mejor día', value: bestDay ? `${bestDay.fecha} · ${money(bestDay.ventas)}` : '—' },
          { label: 'Producto más vendido', value: month.products[0] ? `${month.products[0].name} (${month.products[0].units})` : '—' },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-sm font-bold truncate" title={k.value}>{k.value}</p>
          </div>
        ))}
      </div>

      <ChartBlock title="Ingresos por día del mes" note={monthLabel}>
        <BigLine data={byDay} xKey="label" lines={[{ key: 'ventas', name: 'Ingresos' }]} height={340} />
      </ChartBlock>

      <DetailTable
        title="Detalle día por día"
        columns={[
          { key: 'fecha', label: 'Fecha' },
          { key: 'count', label: 'Tickets', align: 'right', format: num },
          { key: 'ventas', label: 'Ingresos', align: 'right', format: money },
          { key: 'avgTicket', label: 'Ticket prom.', align: 'right', format: money },
        ]}
        rows={byDay.filter(d => d.count > 0)}
        footer={{ fecha: 'Total', count: month.count, ventas: month.revenue, avgTicket: month.avgTicket }}
      />
    </div>
  );
}

/** KPIs financieros: ingreso, costo, ganancia y margen con comparación. */
export function FinancialDetail({ analytics, monthLabel, grossRevenue, cogs, prevCogs }) {
  const grossProfit = grossRevenue - cogs;
  const marginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const prevRevenue = analytics.prev.revenue;
  const prevProfit = prevRevenue - (prevCogs || 0);
  const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : 0;

  const composition = [
    { id: 'cogs', concepto: 'Costo de mercancía vendida', monto: cogs, share: grossRevenue > 0 ? (cogs / grossRevenue) * 100 : 0 },
    { id: 'profit', concepto: 'Ganancia bruta', monto: grossProfit, share: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0 },
  ];

  const chartData = [
    { name: 'Ingreso bruto', valor: grossRevenue },
    { name: 'Costo mercancía', valor: cogs },
    { name: 'Ganancia bruta', valor: grossProfit },
  ];

  const perTicket = analytics.month.count > 0 ? grossProfit / analytics.month.count : 0;

  return (
    <div className="space-y-6">
      <ComparisonGrid
        title={`Resultado financiero de ${monthLabel}`}
        referenceLabel={analytics.prev.label}
        rows={[
          { label: 'Ingreso bruto', current: grossRevenue, previous: prevRevenue, format: money },
          { label: 'Costo mercancía', current: cogs, previous: prevCogs || 0, format: money, invert: true },
          { label: 'Ganancia bruta', current: grossProfit, previous: prevProfit, format: money },
          { label: 'Margen bruto', current: marginPct, previous: prevMargin, format: pct },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ganancia por ticket', value: money(perTicket) },
          { label: 'Costo por ticket', value: money(analytics.month.count > 0 ? cogs / analytics.month.count : 0) },
          { label: 'Ganancia por unidad', value: money(analytics.month.units > 0 ? grossProfit / analytics.month.units : 0) },
          { label: 'Costo sobre ingreso', value: pct(grossRevenue > 0 ? (cogs / grossRevenue) * 100 : 0) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>

      <ChartBlock title="Composición del ingreso">
        <BigBar data={chartData} xKey="name" bars={[{ key: 'valor', name: 'Monto' }]} showLabels height={300} />
      </ChartBlock>

      <DetailTable
        title="Estructura del ingreso bruto"
        columns={[
          { key: 'concepto', label: 'Concepto' },
          { key: 'monto', label: 'Monto', align: 'right', format: money },
          { key: 'share', label: '% del ingreso', align: 'right', format: pct },
        ]}
        rows={composition}
        footer={{ concepto: 'Ingreso bruto', monto: grossRevenue, share: 100 }}
      />

      <DetailTable
        title="Aporte por producto (mes)"
        columns={[
          { key: 'name', label: 'Producto / Sabor' },
          { key: 'units', label: 'Unidades', align: 'right', format: num },
          { key: 'revenue', label: 'Ingresos', align: 'right', format: money },
        ]}
        rows={analytics.month.products.slice(0, 25).map((p, i) => ({ ...p, id: `${p.name}-${i}` }))}
      />
    </div>
  );
}

/** Punto de equilibrio: progreso, gastos fijos por categoría y metas diarias. */
export function BreakEvenDetail({ monthLabel, fixedExpenses, expenseRows, marginInfo, monthlySales, daysInMonth, activeDays }) {
  const marginRatio = Math.max(0.01, Math.min(0.99, marginInfo.marginPct / 100));
  const breakevenRevenue = fixedExpenses > 0 ? fixedExpenses / marginRatio : 0;
  const missing = Math.max(0, breakevenRevenue - monthlySales);
  const surplus = Math.max(0, monthlySales - breakevenRevenue);
  const progressPct = breakevenRevenue > 0 ? (monthlySales / breakevenRevenue) * 100 : 0;

  const byCategory = {};
  expenseRows.forEach(r => {
    const cat = r.expense.category || 'Sin categoría';
    if (!byCategory[cat]) byCategory[cat] = { id: cat, categoria: cat, monto: 0, items: 0 };
    byCategory[cat].monto += r.expense.amount || 0;
    byCategory[cat].items += 1;
  });
  const categories = Object.values(byCategory)
    .map(c => ({ ...c, share: fixedExpenses > 0 ? (c.monto / fixedExpenses) * 100 : 0 }))
    .sort((a, b) => b.monto - a.monto);

  const detailRows = expenseRows.map((r, i) => ({
    id: `${r.expense.id}-${i}`,
    descripcion: r.expense.description,
    categoria: r.expense.category || '—',
    monto: r.expense.amount || 0,
    origen: r.isProjection ? 'Recurrente (proyectado)' : 'Registrado en el mes',
  }));

  const remainingDays = Math.max(0, daysInMonth - activeDays);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gastos fijos del mes', value: money(fixedExpenses) },
          { label: 'Margen de contribución', value: pct(marginInfo.marginPct) },
          { label: 'Ingreso de equilibrio', value: money(breakevenRevenue) },
          { label: 'Avance', value: pct(progressPct) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border-2 p-4 ${surplus > 0 ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        <p className={`text-sm font-semibold ${surplus > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
          {surplus > 0
            ? `Equilibrio alcanzado en ${monthLabel}. Excedente de ${money(surplus)}.`
            : `Faltan ${money(missing)} para cubrir los costos fijos de ${monthLabel}.`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ventas acumuladas {money(monthlySales)} de {money(breakevenRevenue)} necesarias
          {remainingDays > 0 && missing > 0
            ? ` · requiere ${money(missing / remainingDays)} diarios en los ${remainingDays} días restantes`
            : ''}
        </p>
        {marginInfo.usingFallback && (
          <p className="text-[11px] text-amber-700 italic mt-2">
            Cálculo con margen de respaldo del 50%: faltan recetas o presentaciones activas para estimar el margen real.
          </p>
        )}
      </div>

      <ChartBlock title="Ventas acumuladas vs. punto de equilibrio">
        <BigBar
          data={[
            { name: 'Ventas del mes', valor: monthlySales },
            { name: 'Punto de equilibrio', valor: breakevenRevenue },
            { name: 'Gastos fijos', valor: fixedExpenses },
          ]}
          xKey="name"
          bars={[{ key: 'valor', name: 'Monto' }]}
          showLabels
          height={300}
        />
      </ChartBlock>

      <DetailTable
        title="Gastos fijos por categoría"
        columns={[
          { key: 'categoria', label: 'Categoría' },
          { key: 'items', label: 'Partidas', align: 'right', format: num },
          { key: 'monto', label: 'Monto', align: 'right', format: money },
          { key: 'share', label: '% del fijo', align: 'right', format: pct },
        ]}
        rows={categories}
        footer={{ categoria: 'Total', monto: fixedExpenses, share: 100 }}
        emptyText="No hay gastos fijos registrados para este mes"
      />

      <DetailTable
        title="Partidas incluidas en el cálculo"
        columns={[
          { key: 'descripcion', label: 'Descripción' },
          { key: 'categoria', label: 'Categoría' },
          { key: 'origen', label: 'Origen' },
          { key: 'monto', label: 'Monto', align: 'right', format: money },
        ]}
        rows={detailRows}
        emptyText="Sin partidas de gasto fijo"
      />
    </div>
  );
}