import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Receipt, Star, ShoppingCart } from 'lucide-react';

export default function MonthKPIs({ totalSales, salesCount, avgTicket, topProductName }) {
  const metrics = [
    {
      label: 'Total Vendido',
      value: `$${totalSales.toFixed(2)}`,
      sub: `${salesCount} transacciones`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Ticket Promedio',
      value: `$${avgTicket.toFixed(2)}`,
      sub: 'por transacción',
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Producto Más Vendido',
      value: topProductName || '—',
      sub: 'unidades del mes',
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      truncate: true,
    },
    {
      label: 'Ventas del Mes',
      value: salesCount.toString(),
      sub: 'tickets emitidos',
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.label} className="overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`rounded-xl p-2.5 ${m.bg} flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                <p className={`text-xl font-bold tracking-tight ${m.color} ${m.truncate ? 'truncate' : ''}`} title={m.value}>
                  {m.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}