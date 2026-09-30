import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Gift } from 'lucide-react';

export default function FinancialKPIs({ grossRevenue, cogs, courtesyCost = 0, monthSalesCount }) {
  // El COGS total incluye lo regalado: se separa para mostrar la ganancia de lo
  // cobrado y luego restar las cortesías (sin contarlas dos veces).
  const soldCogs = cogs - courtesyCost;
  const grossProfit = grossRevenue - soldCogs;
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netProfit = grossProfit - courtesyCost;
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const courtesyPct = grossProfit > 0 ? (courtesyCost / grossProfit) * 100 : 0;

  const metrics = [
    {
      label: 'Ingreso Bruto (Mes)',
      value: `$${grossRevenue.toFixed(2)}`,
      sub: `${monthSalesCount} transacciones`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Costo Mercancía Vendida',
      value: `$${soldCogs.toFixed(2)}`,
      sub: 'de lo cobrado (helados + envases)',
      icon: ShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Ganancia Bruta',
      value: `$${grossProfit.toFixed(2)}`,
      sub: `Margen: ${grossMarginPct.toFixed(1)}%`,
      icon: grossProfit >= 0 ? TrendingUp : TrendingDown,
      color: grossProfit >= 0 ? 'text-emerald-600' : 'text-destructive',
      bg: grossProfit >= 0 ? 'bg-emerald-50' : 'bg-destructive/10',
    },
    {
      label: 'Costo de Cortesías',
      value: `-$${courtesyCost.toFixed(2)}`,
      sub: `${courtesyPct.toFixed(1)}% de la ganancia bruta`,
      icon: Gift,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Utilidad Neta',
      value: `$${netProfit.toFixed(2)}`,
      sub: `Margen: ${netMarginPct.toFixed(1)}%`,
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-primary' : 'text-destructive',
      bg: netProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <Card key={m.label} className="overflow-hidden">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`rounded-xl p-2.5 ${m.bg} flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                <p className={`text-2xl font-bold tracking-tight ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}