import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const money = (v) => `$${(v || 0).toFixed(2)}`;

function RankTable({ title, rows }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="px-4 py-3 text-sm font-semibold border-b border-border">{title}</p>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="text-left px-4 py-2">Nombre</th><th className="text-right px-4">Unid.</th><th className="text-right px-4">No cobrado</th><th className="text-right px-4">Costo</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className="border-t border-border/60">
              <td className="px-4 py-2">{r.name}</td>
              <td className="text-right px-4 font-mono">{r.units.toFixed(0)}</td>
              <td className="text-right px-4 font-mono">{money(r.value)}</td>
              <td className="text-right px-4 font-mono text-amber-600">{money(r.cost)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Sin datos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function CourtesyDetail({ courtesy }) {
  const { units, foregone, cost, marginPct, byStaff, byProduct, daily } = courtesy;
  const kpis = [['Unidades regaladas', units.toFixed(0)], ['Valor no cobrado', money(foregone)], ['Costo real', money(cost)], ['% margen cedido', `${marginPct.toFixed(1)}%`]];
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold tracking-tight">{v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-3">Evolución diaria</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={money} />
            <Legend />
            <Bar dataKey="value" name="No cobrado" fill="hsl(28,60%,65%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cost" name="Costo real" fill="hsl(38,90%,45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankTable title="Ranking por colaborador" rows={byStaff} />
        <RankTable title="Desglose por producto" rows={byProduct} />
      </div>
    </>
  );
}