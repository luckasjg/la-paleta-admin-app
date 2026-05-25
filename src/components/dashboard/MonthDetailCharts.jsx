import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, DollarSign, Clock, TrendingUp } from 'lucide-react';
import moment from 'moment';

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

export default function MonthDetailCharts({ monthSales }) {
  const { topProducts, paymentData, hourlyData, dailyData } = useMemo(() => {
    const productSales = {};
    const paymentMethods = {};
    const hourly = Array.from({ length: 14 }, (_, i) => ({ hora: `${i + 8}:00`, ventas: 0 }));
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const daily = dayNames.map(name => ({ name, ventas: 0 }));

    monthSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.flavor || item.product_name;
        if (name) productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
      });
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
      topProducts: Object.entries(productSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, ventas: count })),
      paymentData: Object.entries(paymentMethods).map(([name, value]) => ({
        name: PAYMENT_LABELS[name] || name,
        value,
      })),
      hourlyData: hourly,
      dailyData: daily,
    };
  }, [monthSales]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Productos más vendidos
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
    </div>
  );
}