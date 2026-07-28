import React from 'react';
import moment from 'moment';

/**
 * Comanda para impresora térmica (80mm).
 * Siempre montado pero oculto; sólo se hace visible al imprimir (ver @media print en index.css).
 */
export default function OrderTicket({ cart, staffName, shift }) {
  return (
    <div id="order-ticket" className="hidden">
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>COMANDA</div>
      <div style={{ textAlign: 'center', fontSize: '11px' }}>
        {moment().format('DD/MM/YYYY HH:mm')}
      </div>
      <div style={{ fontSize: '11px', marginTop: '4px' }}>
        Cajero: {staffName || '—'} · Turno: {shift || '—'}
      </div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      {cart.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
          <div style={{ fontWeight: 'bold' }}>
            {item.quantity} x {item.product_name}
          </div>
          {item.flavor && <div style={{ fontSize: '12px' }}>Sabores: {item.flavor} ({item.grams}g)</div>}
          {item.vessel && <div style={{ fontSize: '12px' }}>Servir en: {item.vessel === 'taza' ? 'TAZA' : 'VASO'}</div>}
          {item.is_courtesy && <div style={{ fontSize: '12px', fontWeight: 'bold' }}>** CORTESÍA **</div>}
        </div>
      ))}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ fontSize: '12px' }}>Artículos: {cart.reduce((s, i) => s + i.quantity, 0)}</div>
    </div>
  );
}