import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';

export const CHART_COLORS = [
  'hsl(152,35%,38%)', 'hsl(28,60%,60%)', 'hsl(200,40%,50%)', 'hsl(340,55%,55%)',
  'hsl(45,80%,52%)', 'hsl(270,50%,60%)', 'hsl(0,55%,45%)', 'hsl(180,35%,42%)',
];

const GRID = 'hsl(30,15%,86%)';
const money = (v) => `$${Number(v || 0).toFixed(2)}`;

const TooltipBox = ({ active, payload, label, valueFormat }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-sm">{label ?? payload[0]?.name}</p>
      {payload.map(p => (
        <p key={p.dataKey || p.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-mono font-semibold">{(valueFormat || money)(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

/** Barras verticales u horizontales a tamaño ampliado. */
export function BigBar({ data, xKey, bars, height = 340, valueFormat = money, horizontal, showLabels }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: horizontal ? 56 : 12, bottom: 8, left: horizontal ? 8 : 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={valueFormat} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11 }} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} angle={data.length > 12 ? -35 : 0} textAnchor={data.length > 12 ? 'end' : 'middle'} height={data.length > 12 ? 60 : 30} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={valueFormat} />
          </>
        )}
        <Tooltip content={<TooltipBox valueFormat={valueFormat} />} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color || CHART_COLORS[i % CHART_COLORS.length]}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={horizontal ? 22 : 54}
            isAnimationActive={false}
          >
            {showLabels && (
              <LabelList dataKey={b.key} position={horizontal ? 'right' : 'top'} formatter={valueFormat} style={{ fontSize: 10, fontWeight: 600 }} />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Línea de tendencia a tamaño ampliado. */
export function BigLine({ data, xKey, lines, height = 320, valueFormat = money }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={valueFormat} />
        <Tooltip content={<TooltipBox valueFormat={valueFormat} />} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Torta a tamaño ampliado con leyenda legible. */
export function BigPie({ data, height = 340, valueFormat = money }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={115}
          isAnimationActive={false}
          label={({ name, percent }) => `${name} · ${(percent * 100).toFixed(1)}%`}
          labelLine={{ stroke: GRID }}
        >
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip content={<TooltipBox valueFormat={valueFormat} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Contenedor de un gráfico dentro de la vista ampliada. */
export function ChartBlock({ title, note, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">{children}</div>
    </div>
  );
}