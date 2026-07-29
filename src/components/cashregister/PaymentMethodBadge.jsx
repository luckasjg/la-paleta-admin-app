import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePaymentMethods } from '@/lib/usePaymentMethods';

// Muestra el método real de la venta. Sólo dice "Mixto" cuando de verdad
// se combinaron dos o más métodos distintos.
export default function PaymentMethodBadge({ sale }) {
  const { methods } = usePaymentMethods();

  const labelFor = (value) => {
    if (!value) return null;
    const found = methods.find(m => m.value === value);
    if (found) return found.label;
    return value.replace(/_/g, ' ');
  };

  const payments = Array.isArray(sale?.payments) ? sale.payments.filter(p => p?.method) : [];
  const uniqueMethods = [...new Set(payments.map(p => p.method))];

  // Cortesía: venta sin cobro monetario
  if (sale?.payment_method === 'cortesia' || (payments.length === 0 && (sale?.total || 0) === 0)) {
    return (
      <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
        Cortesía
      </Badge>
    );
  }

  let text;
  if (uniqueMethods.length > 1) {
    text = 'Mixto';
  } else if (uniqueMethods.length === 1) {
    text = labelFor(uniqueMethods[0]);
  } else {
    text = sale?.payment_method === 'mixto' ? 'Mixto' : (labelFor(sale?.payment_method) || '—');
  }

  return <Badge variant="secondary" className="text-xs capitalize">{text}</Badge>;
}