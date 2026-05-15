import React from 'react';
import { Gift } from 'lucide-react';
import moment from 'moment';

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  mixto: 'Mixto',
};

export default function PrintReport({ date, todaySales, systemCash, systemDigital, todayTotal, supplies = [] }) {
  const courtesySales = todaySales.filter(s => (s.items || []).some(i => i.is_courtesy));
  const courtesyCount = todaySales.reduce((acc, s) =>
    acc + (s.items || []).filter(i => i.is_courtesy).reduce((a, i) => a + (i.quantity || 1), 0), 0);

  return (
    <div id="print-report" className="hidden print:block font-mono text-black bg-white p-6 text-sm">
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">REPORTE DE CIERRE DE CAJA</h1>
        <p>{moment(date).format('DD/MM/YYYY')} — Impreso: {moment().format('HH:mm')}</p>
        <div className="border-t border-black my-2" />
      </div>

      {/* Summary */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between"><span>Total ventas:</span><span className="font-bold">${todayTotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Nº transacciones:</span><span>{todaySales.length}</span></div>
        <div className="flex justify-between"><span>Efectivo (sistema):</span><span>${systemCash.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Digital:</span><span>${systemDigital.toFixed(2)}</span></div>
        {courtesyCount > 0 && (
          <div className="flex justify-between text-gray-600"><span>Cortesías (ítems):</span><span>{courtesyCount}</span></div>
        )}
      </div>

      <div className="border-t border-black my-2" />

      {/* Sales detail */}
      <h2 className="font-bold mb-2">DETALLE DE VENTAS</h2>
      {todaySales.map((sale, si) => (
        <div key={sale.id} className="mb-3">
          <div className="flex justify-between font-semibold">
            <span>#{si + 1} {moment(sale.sale_date).format('HH:mm')} — {PAYMENT_LABELS[sale.payment_method]}</span>
            <span>${sale.total?.toFixed(2)}</span>
          </div>
          {(sale.items || []).map((item, ii) => {
            const utensil = item.utensil_supply_id
              ? supplies.find(s => s.id === item.utensil_supply_id)
              : null;
            return (
              <div key={ii} className="ml-3 flex justify-between text-xs">
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

      <div className="border-t border-black mt-4 pt-2 text-center text-xs text-gray-500">
        Fin del reporte
      </div>
    </div>
  );
}