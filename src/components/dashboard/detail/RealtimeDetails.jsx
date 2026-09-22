import React from 'react';
import moment from 'moment';
import DetailTable, { money, num, pct } from './DetailTable';
import ComparisonGrid from './ComparisonGrid';
import { BigBar, BigLine, ChartBlock } from './DetailCharts';

/** Ventas de hoy: curva por hora, comparación con ayer y lista de tickets. */
export function TodayDetail({ analytics }) {
  const t = analytics.today;
  const hourly = t.hourly.filter(h => h.hour >= 7 && h.hour <= 23);
  const ticketRows = t.sales
    .slice()
    .sort((a, b) => moment(b.sale_date).valueOf() - moment(a.sale_date).valueOf())
    .map(s => ({
      id: s.id,
      hora: s.sale_date ? moment(s.sale_date).format('HH:mm') : '—',
      staff: s.staff_name || '—',
      metodo: s.payment_method || '—',
      items: (s.items || []).reduce((a, i) => a + (i.quantity || 1), 0),
      total: s.total || 0,
    }));

  return (
    <div className="space-y-6">
      <ComparisonGrid
        title="Hoy vs. ayer"
        referenceLabel={moment().subtract(1, 'day').format('DD/MM/YYYY')}
        rows={[
          { label: 'Ingresos', current: t.revenue, previous: t.yesterday.revenue, format: money },
          { label: 'Transacciones', current: t.count, previous: t.yesterday.count, format: num },
          { label: 'Ticket promedio', current: t.avgTicket, previous: t.yesterday.avgTicket, format: money },
          { label: 'Unidades vendidas', current: t.units, previous: t.yesterday.units, format: num },
        ]}
      />
      <ChartBlock title="Ingresos por hora (hoy)" note="Horario 07:00 – 23:00">
        <BigLine data={hourly} xKey="hora" lines={[{ key: 'ventas', name: 'Ingresos' }]} />
      </ChartBlock>
      <DetailTable
        title={`Tickets de hoy (${ticketRows.length})`}
        columns={[
          { key: 'hora', label: 'Hora' },
          { key: 'staff', label: 'Cajero' },
          { key: 'metodo', label: 'Método' },
          { key: 'items', label: 'Ítems', align: 'right', format: num },
          { key: 'total', label: 'Total', align: 'right', format: money },
        ]}
        rows={ticketRows}
        footer={{ hora: 'Total', items: ticketRows.reduce((s, r) => s + r.items, 0), total: t.revenue }}
        emptyText="Aún no hay ventas registradas hoy"
      />
    </div>
  );
}

/** Ventana de 7 días: tendencia diaria y comparación con los 7 días previos. */
export function WeekDetail({ analytics }) {
  const w = analytics.week;
  const rows = w.days.map(d => ({
    id: d.key,
    fecha: `${d.dayName} ${d.label}`,
    count: d.count,
    ventas: d.ventas,
    ticket: d.count > 0 ? d.ventas / d.count : 0,
    share: w.total > 0 ? (d.ventas / w.total) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <ComparisonGrid
        title="Últimos 7 días vs. 7 días anteriores"
        referenceLabel="semana previa"
        rows={[
          { label: 'Ingresos', current: w.total, previous: w.prevTotal, format: money },
          { label: 'Promedio diario', current: w.total / 7, previous: w.prevTotal / 7, format: money },
          { label: 'Transacciones', current: w.count, previous: 0, format: num },
          { label: 'Mejor día', current: Math.max(...w.days.map(d => d.ventas), 0), previous: 0, format: money },
        ]}
      />
      <ChartBlock title="Ingresos por día (últimos 7 días)">
        <BigBar data={w.days} xKey="label" bars={[{ key: 'ventas', name: 'Ingresos' }]} showLabels />
      </ChartBlock>
      <DetailTable
        title="Detalle diario"
        columns={[
          { key: 'fecha', label: 'Día' },
          { key: 'count', label: 'Tickets', align: 'right', format: num },
          { key: 'ventas', label: 'Ingresos', align: 'right', format: money },
          { key: 'ticket', label: 'Ticket prom.', align: 'right', format: money },
          { key: 'share', label: '% semana', align: 'right', format: pct },
        ]}
        rows={rows}
        footer={{ fecha: 'Total', count: w.count, ventas: w.total, ticket: w.count > 0 ? w.total / w.count : 0, share: 100 }}
      />
    </div>
  );
}

/** Bandejas activas: gramos restantes, consumo del lote y estado de vitrina. */
export function TraysDetail({ trays }) {
  const rows = trays
    .slice()
    .sort((a, b) => (a.remaining_grams || 0) - (b.remaining_grams || 0))
    .map(t => {
      const initial = t.initial_grams || 0;
      const remaining = t.remaining_grams || 0;
      return {
        id: t.id,
        sabor: t.recipe_name,
        ubicacion: t.in_vitrine ? 'Vitrina' : 'Reserva',
        inicial: initial,
        restante: remaining,
        consumido: Math.max(0, initial - remaining),
        avance: initial > 0 ? Math.min(100, ((initial - remaining) / initial) * 100) : 0,
        rellenos: t.refill_count || 0,
        produccion: t.production_date ? moment(t.production_date).format('DD/MM/YYYY') : '—',
      };
    });

  const chartData = rows.slice(0, 15).map(r => ({ name: r.sabor, restante: r.restante }));
  const grams = (v) => `${Number(v || 0).toFixed(0)}g`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Bandejas activas', value: num(rows.length) },
          { label: 'En vitrina', value: num(rows.filter(r => r.ubicacion === 'Vitrina').length) },
          { label: 'Gramos disponibles', value: grams(rows.reduce((s, r) => s + r.restante, 0)) },
          { label: 'Bajo 200g', value: num(rows.filter(r => r.restante < 200).length) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>
      <ChartBlock title="Gramos restantes por bandeja" note="15 bandejas con menor existencia">
        <BigBar data={chartData} xKey="name" bars={[{ key: 'restante', name: 'Gramos restantes' }]} horizontal valueFormat={grams} height={Math.max(260, chartData.length * 30)} showLabels />
      </ChartBlock>
      <DetailTable
        title="Existencias por bandeja"
        columns={[
          { key: 'sabor', label: 'Sabor' },
          { key: 'ubicacion', label: 'Ubicación' },
          { key: 'inicial', label: 'Lote', align: 'right', format: grams },
          { key: 'consumido', label: 'Consumido', align: 'right', format: grams },
          { key: 'restante', label: 'Restante', align: 'right', format: grams },
          { key: 'avance', label: '% vendido', align: 'right', format: pct },
          { key: 'rellenos', label: 'Rellenos', align: 'right', format: num },
          { key: 'produccion', label: 'Último lote' },
        ]}
        rows={rows}
        emptyText="No hay bandejas activas"
      />
    </div>
  );
}

/** Insumos bajo mínimo: déficit y costo de reposición. */
export function LowStockDetail({ supplies, lowStockSupplies }) {
  const rows = lowStockSupplies
    .map(s => {
      const deficit = Math.max(0, (s.stock_minimum || 0) - (s.stock_current || 0));
      return {
        id: s.id,
        insumo: s.name,
        sector: s.sector || '—',
        unidad: s.unit,
        actual: s.stock_current || 0,
        minimo: s.stock_minimum || 0,
        deficit,
        costo: deficit * (s.cost_per_unit || 0),
        proveedor: s.supplier || '—',
      };
    })
    .sort((a, b) => b.deficit - a.deficit);

  const qty = (v, row) => `${Number(v || 0).toFixed(0)}${row?.unidad || ''}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Insumos bajo mínimo', value: num(rows.length) },
          { label: 'Insumos monitoreados', value: num(supplies.filter(s => s.stock_minimum).length) },
          { label: 'Costo de reposición', value: money(rows.reduce((s, r) => s + r.costo, 0)) },
          { label: 'Sin existencia', value: num(rows.filter(r => r.actual <= 0).length) },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>
      <DetailTable
        title="Insumos que requieren reposición"
        columns={[
          { key: 'insumo', label: 'Insumo' },
          { key: 'sector', label: 'Sector' },
          { key: 'actual', label: 'Existencia', align: 'right', format: qty },
          { key: 'minimo', label: 'Mínimo', align: 'right', format: qty },
          { key: 'deficit', label: 'Déficit', align: 'right', format: qty },
          { key: 'costo', label: 'Costo repos.', align: 'right', format: money },
          { key: 'proveedor', label: 'Proveedor' },
        ]}
        rows={rows}
        footer={{ insumo: 'Total', costo: rows.reduce((s, r) => s + r.costo, 0) }}
        emptyText="Todos los insumos están por encima del mínimo"
      />
    </div>
  );
}