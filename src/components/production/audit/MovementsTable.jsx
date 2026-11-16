import React from 'react';
import { formatVET } from '@/lib/vetTime';
import { LOCATION_LABEL } from '@/lib/stockHelpers';

const n = (v) => (Number(v) || 0).toLocaleString('es-VE', { maximumFractionDigits: 1 });

export default function MovementsTable({ movements, showOrigin = false }) {
  if (!movements.length) return <p className="text-xs text-muted-foreground py-2">Sin movimientos registrados.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr className="text-left">
            <th className="py-1.5 pr-3 font-medium">Fecha (hora VE)</th>
            <th className="py-1.5 pr-3 font-medium">{showOrigin ? 'Origen' : 'Insumo'}</th>
            <th className="py-1.5 pr-3 font-medium text-right">Cantidad</th>
            <th className="py-1.5 pr-3 font-medium">Ubicación</th>
            <th className="py-1.5 font-medium text-right">Stock antes → después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {movements.map(m => (
            <tr key={m.id}>
              <td className="py-1.5 pr-3 whitespace-nowrap">{formatVET(m.created_date)}</td>
              <td className="py-1.5 pr-3">
                {showOrigin ? m.reference_label : m.supply_name}
                {m.is_correction && <span className="ml-1 text-amber-700">(corrección)</span>}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono">{n(m.quantity_change)}{m.unit}</td>
              <td className="py-1.5 pr-3">{LOCATION_LABEL[m.location] || '—'}</td>
              <td className="py-1.5 text-right font-mono whitespace-nowrap">{n(m.stock_before)} → {n(m.stock_after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}