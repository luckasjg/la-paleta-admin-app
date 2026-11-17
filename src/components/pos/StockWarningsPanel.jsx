import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Aviso de bandejas sin gramos suficientes para el carrito actual.
export default function StockWarningsPanel({ warnings }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
        <AlertTriangle className="h-4 w-4" /> ¡Atención! Stock insuficiente
      </div>
      {warnings.map(w => (
        <div key={w.tray_id} className="text-[11px] text-amber-900 leading-tight">
          <span className="font-semibold">{w.name}</span>: faltan{' '}
          <span className="font-mono font-bold">{w.missing.toFixed(0)}g</span>
          <span className="text-amber-700"> (disponible {w.available.toFixed(0)}g / pedido {w.demanded.toFixed(0)}g)</span>
        </div>
      ))}
      <p className="text-[10px] text-amber-700 italic pt-1 border-t border-amber-200">
        Puedes continuar la venta. Verifica el inventario físico al cierre.
      </p>
    </div>
  );
}