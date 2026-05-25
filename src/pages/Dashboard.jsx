import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, IceCream, AlertTriangle, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import FinancialKPIs from '@/components/dashboard/FinancialKPIs';
import BreakEvenPanel from '@/components/dashboard/BreakEvenPanel.jsx';
import DataSimulator from '@/components/dashboard/DataSimulator';
import AnnualSalesChart from '@/components/dashboard/AnnualSalesChart';
import MonthDetailCharts from '@/components/dashboard/MonthDetailCharts';
import MonthKPIs from '@/components/dashboard/MonthKPIs';
import moment from 'moment';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Dashboard() {
  const { data: rawSales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
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

  // Exclude any simulator/test data ([TEST]) and voided sales from analytics
  const sales = useMemo(
    () => rawSales.filter(s =>
      s.status !== 'voided' &&
      !(s.items || []).some(it => it.product_name?.startsWith('[TEST]'))
    ),
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

  // ── Selected period state (year + month) ──────────────────────────────
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().month());

  // When sales load, default to the last month that has sales (if current is empty)
  useEffect(() => {
    if (sales.length === 0) return;
    const currentYear = moment().year();
    const currentMonth = moment().month();
    const hasCurrent = sales.some(s => {
      if (!s.sale_date) return false;
      const m = moment(s.sale_date);
      return m.year() === currentYear && m.month() === currentMonth;
    });
    if (!hasCurrent) {
      const latest = sales
        .filter(s => s.sale_date)
        .map(s => moment(s.sale_date))
        .sort((a, b) => b.valueOf() - a.valueOf())[0];
      if (latest) {
        setSelectedYear(latest.year());
        setSelectedMonth(latest.month());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.length]);

  // ── Sales for the selected month ──────────────────────────────────────
  const monthSales = useMemo(() => sales.filter(s => {
    if (!s.sale_date) return false;
    const m = moment(s.sale_date);
    return m.year() === selectedYear && m.month() === selectedMonth;
  }), [sales, selectedYear, selectedMonth]);

  // ── Today / week (always real-time, independent of selected month) ────
  const today = moment().format('YYYY-MM-DD');
  const todaySales = sales.filter(s => s.sale_date && moment(s.sale_date).format('YYYY-MM-DD') === today);
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const weekTotal = sales
    .filter(s => s.sale_date && moment(s.sale_date).isAfter(moment().subtract(7, 'days')))
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const lowStockSupplies = supplies.filter(s => s.stock_minimum && s.stock_current <= s.stock_minimum);

  // ── Gross Revenue (selected month) ────────────────────────────────────
  const grossRevenue = useMemo(
    () => monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
    [monthSales]
  );

  // ── COGS for selected month ───────────────────────────────────────────
  const cogs = useMemo(() => {
    let total = 0;
    const supplyCost = {};
    supplies.forEach(s => { supplyCost[s.id] = s.cost_per_unit || 0; });

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
        if (item.tray_id) {
          const tray = trays.find(t => t.id === item.tray_id);
          const recipeId = tray?.recipe_id;
          const costPerGram = recipeId ? (recipeCostPerGram[recipeId] || 0) : 0;
          total += costPerGram * (item.grams || 0);
        }
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

  // ── Month KPIs ────────────────────────────────────────────────────────
  const avgTicket = monthSales.length > 0 ? grossRevenue / monthSales.length : 0;
  const topProductName = useMemo(() => {
    const counts = {};
    monthSales.forEach(s => (s.items || []).forEach(it => {
      const n = it.flavor || it.product_name;
      if (n) counts[n] = (counts[n] || 0) + (it.quantity || 1);
    }));
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return top ? `${top[0]} (${top[1]})` : null;
  }, [monthSales]);

  const monthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Dashboard Financiero" description="Panel interactivo de análisis y rentabilidad" />

      {/* Real-time top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas Hoy" value={`$${todayTotal.toFixed(2)}`} icon={DollarSign} subtitle={`${todaySales.length} transacciones`} />
        <StatCard title="Ventas 7 días" value={`$${weekTotal.toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="Bandejas Activas" value={trays.length} icon={IceCream} />
        <StatCard title="Alertas Stock" value={lowStockSupplies.length} icon={AlertTriangle} subtitle={lowStockSupplies.length > 0 ? 'Insumos bajos' : 'Todo OK'} />
      </div>

      {/* Annual interactive chart */}
      <AnnualSalesChart
        sales={sales}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        onChangeYear={setSelectedYear}
      />

      {/* Selected month section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Detalle de Operaciones — <span className="text-primary">{monthLabel}</span>
          </h2>
          <Badge variant="secondary" className="text-xs">
            {monthSales.length} transacciones · ${grossRevenue.toFixed(2)}
          </Badge>
        </div>

        <MonthKPIs
          totalSales={grossRevenue}
          salesCount={monthSales.length}
          avgTicket={avgTicket}
          topProductName={topProductName}
        />

        {/* Financial + Break-even side by side on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3">
            <FinancialKPIs
              grossRevenue={grossRevenue}
              cogs={cogs}
              monthSalesCount={monthSales.length}
            />
          </div>
          <div className="xl:col-span-2">
            <BreakEvenPanel
              year={selectedYear}
              month={selectedMonth}
              monthlySales={grossRevenue}
              recipes={recipes}
              products={products}
              supplies={supplies}
            />
          </div>
        </div>

        {/* Detail charts grid */}
        <MonthDetailCharts monthSales={monthSales} />
      </div>

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

      <DataSimulator />
    </div>
  );
}