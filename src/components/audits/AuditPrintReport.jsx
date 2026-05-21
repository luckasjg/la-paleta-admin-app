import React from 'react';
import moment from 'moment';

const shiftLabel = (s) => s === 'manana' ? 'Mañana' : s === 'tarde' ? 'Tarde' : s === 'noche' ? 'Noche' : '—';

export default function AuditPrintReport({ audit }) {
  if (!audit) return null;
  const entries = audit.entries || [];
  const totalInitial = entries.reduce((s, e) => s + (e.initial_grams || 0), 0);
  const totalSold = entries.reduce((s, e) => s + (e.grams_sold_theoretical || 0), 0);
  const totalTheoretical = entries.reduce((s, e) => s + (e.theoretical_stock || 0), 0);
  const totalPhysical = entries.reduce((s, e) => s + (e.physical_weight || 0), 0);

  return (
    <div id="print-report" style={{ display: 'none' }}>
      <h2 style={{ textAlign: 'center', margin: 0 }}>Auditoría de Helado</h2>
      <p style={{ textAlign: 'center', margin: '4px 0 16px' }}>
        Fecha: {moment(audit.audit_date).format('DD/MM/YYYY')} — Turno: {shiftLabel(audit.shift)}
      </p>
      <p style={{ margin: '4px 0' }}>Operario: {audit.created_by || '—'}</p>
      <p style={{ margin: '4px 0' }}>Registrado: {audit.created_date ? moment(audit.created_date).format('DD/MM/YYYY HH:mm') : '—'}</p>

      <hr style={{ margin: '12px 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '4px' }}>Sabor</th>
            <th style={{ textAlign: 'right', padding: '4px' }}>Inicial (g)</th>
            <th style={{ textAlign: 'right', padding: '4px' }}>Vendido (g)</th>
            <th style={{ textAlign: 'right', padding: '4px' }}>Teórico (g)</th>
            <th style={{ textAlign: 'right', padding: '4px' }}>Físico (g)</th>
            <th style={{ textAlign: 'right', padding: '4px' }}>Varianza (g)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => (
            <tr key={idx} className="sale-row" style={{ borderBottom: '1px dashed #999' }}>
              <td style={{ padding: '4px' }}>{e.recipe_name}</td>
              <td style={{ textAlign: 'right', padding: '4px' }}>{(e.initial_grams || 0).toFixed(0)}</td>
              <td style={{ textAlign: 'right', padding: '4px' }}>{(e.grams_sold_theoretical || 0).toFixed(0)}</td>
              <td style={{ textAlign: 'right', padding: '4px' }}>{(e.theoretical_stock || 0).toFixed(0)}</td>
              <td style={{ textAlign: 'right', padding: '4px' }}>{(e.physical_weight || 0).toFixed(0)}</td>
              <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold' }}>
                {(e.variance || 0) > 0 ? '+' : ''}{(e.variance || 0).toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
            <td style={{ padding: '4px' }}>TOTALES</td>
            <td style={{ textAlign: 'right', padding: '4px' }}>{totalInitial.toFixed(0)}</td>
            <td style={{ textAlign: 'right', padding: '4px' }}>{totalSold.toFixed(0)}</td>
            <td style={{ textAlign: 'right', padding: '4px' }}>{totalTheoretical.toFixed(0)}</td>
            <td style={{ textAlign: 'right', padding: '4px' }}>{totalPhysical.toFixed(0)}</td>
            <td style={{ textAlign: 'right', padding: '4px' }}>
              {(audit.total_variance_grams || 0) > 0 ? '+' : ''}{(audit.total_variance_grams || 0).toFixed(0)}
            </td>
          </tr>
        </tfoot>
      </table>

      {audit.notes && (
        <>
          <hr style={{ margin: '12px 0' }} />
          <p style={{ margin: 0 }}><strong>Observaciones:</strong> {audit.notes}</p>
        </>
      )}

      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 10 }}>
        Reporte generado el {moment().format('DD/MM/YYYY HH:mm')}
      </p>
    </div>
  );
}