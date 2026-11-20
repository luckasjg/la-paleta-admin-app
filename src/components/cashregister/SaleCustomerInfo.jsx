import React from 'react';
import { UserRound, UserX } from 'lucide-react';

/** Datos del cliente guardados en la venta, para identificarla al anular o rehacer. */
export default function SaleCustomerInfo({ sale }) {
  const hasCustomer = sale.customer_name || sale.customer_cedula;
  if (!hasCustomer) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        <UserX className="h-4 w-4" /> Sin datos de cliente en esta venta
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
      <UserRound className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cliente</p>
        <p className="text-sm font-medium truncate">{sale.customer_name || 'Nombre no registrado'}</p>
        <p className="text-xs font-mono text-muted-foreground">
          {sale.customer_cedula ? `C.I. ${sale.customer_cedula}` : 'Cédula no registrada'}
        </p>
      </div>
    </div>
  );
}