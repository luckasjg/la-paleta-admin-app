import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, DollarSign, Clock, TrendingUp } from 'lucide-react';
import moment from 'moment';
import ExpandableCard from '@/components/dashboard/ExpandableCard';
import { itemBreakdown } from '@/lib/dashboardAnalytics';
import CourtesyCard from '@/components/dashboard/CourtesyCard';

const COLORS = ['hsl(152,35%,38%)', 'hsl(28,60%,65%)', 'hsl(200,40%,50%)', 'hsl(340,55%,55%)', 'hsl(45,80%,55%)', 'hsl(270,50%,60%)'];

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  zelle: 'Zelle',
  mixto: 'Mixto',
};

export default function MonthDetailCharts({ monthSales, courtesy, onExpand }) {
  const { topProducts, paymentData, hourlyData, dailyData } = useMemo(() => {
    // Los sabores se cuentan individualmente (un combo suma a cada sabor).
    const ranking = itemBreakdown(monthSales).products;
    const paymentMethods = {};
    const hourly = Array.from({ length: 14 }, (_, i) => ({ hora: `${i + 8}:00`, ventas: 0 }));
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const daily = dayNames.map(name => ({ name, ventas: 0 }));

    monthSales.forEach(sale => {
      const method = sale.payment_method || 'otro';
      paymentMethods[method] = (paymentMethods[method] || 0) + (sale.total || 0);

      if (sale.sale_date) {
        const m = moment(sale.sale_date);
        const idx = m.hour() - 8;
        if (idx >= 0 && idx < 14) hourly[idx].ventas += (sale.total || 0);
        daily[m.day()].ventas += (sale.total || 0);
      }
    });

    return {
      topProducts: ranking.slice(0, 8).map(p => ({
        name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
        ventas: p.units,
      })),
      paymentData: (() => {
        const sum = Object.values(paymentMethods).reduce((s, v) => s + v, 0);
        return Object.entries(paymentMethods)
          .map(([name, value]) => ({ name: PAYMENT_LABELS[name] || name, value, pct: sum > 0 ? (value / sum) * 100 : 0 }))
          .sort((a, b) => b.value - a.value);
      })(),
      hourlyData: hourly,
      dailyData: daily,
    };
  }, [monthSales]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
      {courtesy && (
        <ExpandableCard label="cortesías y bonos" onExpand={onExpand && (() => onExpand('cortesias'))}>
          <CourtesyCard courtesy={courtesy} />
        </ExpandableCard>
      )}
      <ExpandableCard label="productos más vendidos" onExpand={onExpand && (() => onExpand('productos'))}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Productos y sabores más vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="ventas" fill="hsl(152,35%,38%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      </ExpandableCard>

      <ExpandableCard label="métodos de pago" onExpand={onExpand && (() => onExpand('pagos'))}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] overflow-y-auto space-y-3 pr-1">
            {paymentData.length === 0 && <p className="text-sm text-muted-foreground text-center pt-16">Sin ventas este mes</p>}
            {paymentData.map(p => (
              <div key={p.name} title={`${p.name}: $${p.value.toFixed(2)} (${p.pct.toFixed(1)}%)`}>
                <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="font-mono shrink-0"><strong>${p.value.toFixed(2)}</strong> <span className="text-muted-foreground">· {p.pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(p.pct, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </ExpandableCard>

      <ExpandableCard label="ventas por hora" onExpand={onExpand && (() => onExpand('horas'))}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Ventas por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="ventas" stroke="hsl(152,35%,38%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      </ExpandableCard>

      <ExpandableCard label="ventas por día" onExpand={onExpand && (() => onExpand('dias'))}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ventas por Día de la Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Bar dataKey="ventas" fill="hsl(28,60%,65%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      </ExpandableCard>
    </div>
  );
}