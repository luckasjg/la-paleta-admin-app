import React from 'react';
import moment from 'moment';

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  zelle: 'Zelle',
  mixto: 'Mixto',
};

export default function PrintReport({ date, shift, operator, sales = [], supplies = [], register = null }) {
  const total = sales.reduce((s, v) => s + (v.total || 0), 0);
  const cashTotal = sales.reduce((s, v) => s + (v.cash_amount || 0), 0);
  const digitalTotal = sales.reduce((s, v) => s + (v.digital_amount || 0), 0);

  const byMethod = {};
  sales.forEach(s => {
    const m = s.payment_method || 'mixto';
    byMethod[m] = (byMethod[m] || 0) + (s.total || 0);
  });

  const courtesyCount = sales.reduce((acc, s) =>
    acc + (s.items || []).filter(i => i.is_courtesy).reduce((a, i) => a + (i.quantity || 1), 0), 0);

  const utensilCount = {};
  sales.forEach(s => {
    (s.items || []).forEach(i => {
      if (i.utensil_supply_id) {
        const sup = supplies.find(x => x.id === i.utensil_supply_id);
        const name = sup?.name || 'Utensilio';
        utensilCount[name] = (utensilCount[name] || 0) + (i.quantity || 1);
      }
    });
  });

  const shiftLabel = shift === 'manana' ? 'Mañana' : shift === 'tarde' ? 'Tarde' : shift === 'noche' ? 'Noche' : '—';

  return (
    <div id="print-report" className="hidden print:block">
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>REPORTE DE CIERRE DE CAJA</h1>
        <p style={{ margin: '4px 0' }}>
          {moment(date).format('DD/MM/YYYY')} — Turno: {shiftLabel}
        </p>
        <p style={{ margin: 0, fontSize: 11 }}>Cajero: {operator || '—'}</p>
        <p style={{ margin: 0, fontSize: 11 }}>Impreso: {moment().format('DD/MM/YYYY HH:mm')}</p>
        <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Ventas:</span><span><strong>${total.toFixed(2)}</strong></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Nº Transacciones:</span><span>{sales.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Efectivo (sistema):</span><span>${cashTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Digital:</span><span>${digitalTotal.toFixed(2)}</span>
        </div>
        {register && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Efectivo Declarado:</span><span>${(register.declared_cash || 0).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Diferencia:</span>
              <span>{(register.difference || 0) > 0 ? '+' : ''}${(register.difference || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />

      <h2 style={{ fontSize: 13, fontWeight: 'bold', margin: '8px 0' }}>VENTAS POR MÉTODO</h2>
      {Object.entries(byMethod).map(([m, amt]) => (
        <div key={m} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{PAYMENT_LABELS[m] || m}:</span><span>${amt.toFixed(2)}</span>
        </div>
      ))}

      {courtesyCount > 0 && (
        <>
          <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Cortesías (ítems):</span><span>{courtesyCount}</span>
          </div>
        </>
      )}

      {Object.keys(utensilCount).length > 0 && (
        <>
          <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />
          <h2 style={{ fontSize: 13, fontWeight: 'bold', margin: '8px 0' }}>INSUMOS DESCONTADOS</h2>
          {Object.entries(utensilCount).map(([name, qty]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{name}:</span><span>{qty}</span>
            </div>
          ))}
        </>
      )}

      <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />

      <h2 style={{ fontSize: 13, fontWeight: 'bold', margin: '8px 0' }}>DETALLE DE VENTAS</h2>
      {sales.length === 0 && <p style={{ fontStyle: 'italic' }}>Sin ventas registradas.</p>}
      {sales.map((sale, si) => (
        <div key={sale.id || si} className="sale-row" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>#{si + 1} {moment(sale.sale_date).format('HH:mm')} — {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</span>
            <span>${sale.total?.toFixed(2)}</span>
          </div>
          {(sale.items || []).map((item, ii) => {
            const utensil = item.utensil_supply_id ? supplies.find(s => s.id === item.utensil_supply_id) : null;
            return (
              <div key={ii} style={{ marginLeft: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>
                  {item.is_courtesy ? '[CORTESÍA] ' : ''}{item.quantity}x {item.product_name}
                  {item.flavor ? ` (${item.flavor})` : ''}
                  {utensil ? ` + ${utensil.name}` : ''}
                </span>
                <span>{item.is_courtesy ? '$0.00' : `$${item.subtotal?.toFixed(2)}`}</span>
              </div>
            );
          })}
        </div>
      ))}

      <hr style={{ borderTop: '1px dashed black', margin: '8px 0' }} />
      <p style={{ textAlign: 'center', fontSize: 10 }}>Fin del reporte</p>
    </div>
  );
}