import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, IceCream, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import FinancialKPIs from '@/components/dashboard/FinancialKPIs';
import BreakEvenPanel from '@/components/dashboard/BreakEvenPanel';

import DataSimulator from '@/components/dashboard/DataSimulator';
import moment from 'moment';

const COLORS = ['hsl(152,35%,38%)', 'hsl(28,60%,65%)', 'hsl(200,40%,50%)', 'hsl(340,55%,55%)', 'hsl(45,80%,55%)', 'hsl(270,50%,60%)'];

export default function Dashboard() {
  const { data: rawSales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      // Page through ALL sales so the dashboard reflects the full history,
      // not just the most recent 500 (otherwise stale test data lingers).
      const all = [];
      let page = 0;
      while (page < 50) {
        const batch = await base44.entities.Sale.list('-sale_date', 500, page * 500);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 500) break;
        page++;
      }
      return all;
    },
  });

  // Exclude any simulator/test data (items prefixed with [TEST]) from analytics
  const sales = useMemo(
    () => rawSales.filter(s => !(s.items || []).some(it => it.product_name?.startsWith('[TEST]'))),
    [rawSales]
  );

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.filter({ status: 'activa' }),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const today = moment().format('YYYY-MM-DD');
  const startOfMonth = moment().startOf('month');

  const todaySales = sales.filter(s => s.sale_date && moment(s.sale_date).format('YYYY-MM-DD') === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const weekTotal = sales.filter(s => s.sale_date && moment(s.sale_date).isAfter(moment().subtract(7, 'days'))).reduce((sum, s) => sum + (s.total || 0), 0);
  const monthSales = sales.filter(s => s.sale_date && moment(s.sale_date).isSameOrAfter(startOfMonth));

  const lowStockSupplies = supplies.filter(s => s.stock_minimum && s.stock_current <= s.stock_minimum);

  // ── Gross Revenue (month) ────────────────────────────────────────────
  const grossRevenue = useMemo(() =>
    monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
    [monthSales]
  );

  // ── COGS: sum cost of every gram of ice cream sold + utensils this month ──
  const cogs = useMemo(() => {
    let total = 0;
    // Build supply cost lookup
    const supplyCost = {};
    supplies.forEach(s => { supplyCost[s.id] = s.cost_per_unit || 0; });

    // Build recipe cost-per-gram lookup
    const recipeCostPerGram = {};
    recipes.forEach(recipe => {
      if (!recipe.ingredients?.length) return;
      const ingredientCost = recipe.ingredients.reduce((sum, ing) => {
        return sum + (supplyCost[ing.supply_id] || 0) * (ing.quantity || 0);
      }, 0);
      const yieldAmt = recipe.yield_amount || 1000;
      recipeCostPerGram[recipe.id] = ingredientCost / yieldAmt;
    });

    monthSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        // Ice cream: cost by tray consumption (grams sold × cost per gram via recipe)
        if (item.tray_id) {
          // Find recipe for this tray from the trays list (best effort)
          const tray = trays.find(t => t.id === item.tray_id);
          const recipeId = tray?.recipe_id;
          const costPerGram = recipeId ? (recipeCostPerGram[recipeId] || 0) : 0;
          total += costPerGram * (item.grams || 0);
        }
        // Utensil: look up product's utensil_supply_id
        if (item.product_id) {
          const product = products.find(p => p.id === item.product_id);
          if (product?.utensil_supply_id) {
            total += (supplyCost[product.utensil_supply_id] || 0) * (item.quantity || 1);
          }
        }
      });
    });
    return total;
  }, [monthSales, supplies, recipes, trays, products]);

  // ── Charts data ──────────────────────────────────────────────────────
  const productSales = {};
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      const name = item.flavor || item.product_name;
      if (name) productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
    });
  });
  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, ventas: count }));

  const paymentMethods = {};
  sales.forEach(s => {
    const method = s.payment_method || 'otro';
    paymentMethods[method] = (paymentMethods[method] || 0) + (s.total || 0);
  });
  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name: name === 'efectivo' ? 'Efectivo' : name === 'pago_movil' ? 'Pago Móvil' : name === 'punto_venta' ? 'Tarjeta' : 'Mixto',
    value,
  }));

  const hourlyData = Array.from({ length: 14 }, (_, i) => ({ hora: `${i + 8}:00`, ventas: 0 }));
  sales.forEach(s => {
    if (s.sale_date) {
      const hour = moment(s.sale_date).hour();
      const idx = hour - 8;
      if (idx >= 0 && idx < 14) hourlyData[idx].ventas += (s.total || 0);
    }
  });

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dailyData = dayNames.map(name => ({ name, ventas: 0 }));
  sales.forEach(s => {
    if (s.sale_date) dailyData[moment(s.sale_date).day()].ventas += (s.total || 0);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Financiero" description="Panel de análisis y rentabilidad" />

      {/* Basic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas Hoy" value={`$${todayTotal.toFixed(2)}`} icon={DollarSign} subtitle={`${todaySales.length} transacciones`} />
        <StatCard title="Ventas Semana" value={`$${weekTotal.toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="Bandejas Activas" value={trays.length} icon={IceCream} />
        <StatCard title="Alertas Stock" value={lowStockSupplies.length} icon={AlertTriangle} subtitle={lowStockSupplies.length > 0 ? 'Insumos bajos' : 'Todo OK'} />
      </div>

      {/* Financial KPIs (month) */}
      <FinancialKPIs
        grossRevenue={grossRevenue}
        cogs={cogs}
        monthSalesCount={monthSales.length}
      />

      {/* Break-Even Panel */}
      <BreakEvenPanel grossProfit={grossRevenue - cogs} />

      {/* Low stock alerts */}
      {lowStockSupplies.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Insumos con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockSupplies.map(s => (
                <Badge key={s.id} variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                  {s.name}: {s.stock_current}{s.unit} (mín: {s.stock_minimum}{s.unit})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Productos más vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-4">
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
              Ventas por Día
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

      <DataSimulator />
    </div>
  );
}