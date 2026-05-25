import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Info, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getFixedExpensesForMonth } from '@/lib/expenseProjections';
import { useAverageMargin } from '@/lib/useAverageMargin';

export default function BreakEvenPanel({ year, month, monthlySales, recipes, products, supplies }) {
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000),
  });

  const fixedExpenses = getFixedExpensesForMonth(expenses, year, month);
  const marginInfo = useAverageMargin({ recipes, products, supplies, fixedServiceCosts: 0 });
  const marginPct = marginInfo.marginPct;
  const marginRatio = Math.max(0.01, Math.min(0.99, marginPct / 100));

  const breakevenRevenue = fixedExpenses > 0 ? fixedExpenses / marginRatio : 0;
  const progressPct = breakevenRevenue > 0 ? Math.min(100, (monthlySales / breakevenRevenue) * 100) : 0;
  const reached = monthlySales >= breakevenRevenue && breakevenRevenue > 0;
  const missing = Math.max(0, breakevenRevenue - monthlySales);
  const surplus = Math.max(0, monthlySales - breakevenRevenue);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Punto de Equilibrio
          </span>
          <Link
            to="/gastos"
            className="text-[10px] font-normal text-muted-foreground hover:text-primary flex items-center gap-1"
            title="Gestionar gastos y categorías"
          >
            Gestionar <ExternalLink className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/60 p-2.5">
            <p className="text-[10px] text-muted-foreground">Gastos Fijos</p>
            <p className="text-base font-bold font-mono">${fixedExpenses.toFixed(2)}</p>
          </div>
          <div className={`rounded-lg p-2.5 border ${marginInfo.usingFallback ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-1">
              {marginInfo.usingFallback ? <Info className="h-3 w-3 text-amber-600" /> : <Sparkles className="h-3 w-3 text-emerald-600" />}
              <p className="text-[10px] text-muted-foreground">Margen</p>
            </div>
            <p className={`text-base font-bold font-mono ${marginInfo.usingFallback ? 'text-amber-700' : 'text-emerald-700'}`}>
              {marginPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <p className="text-[10px] text-muted-foreground">Equilibrio</p>
            <p className="text-base font-bold font-mono text-primary">${breakevenRevenue.toFixed(2)}</p>
          </div>
        </div>

        {marginInfo.usingFallback && (
          <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5 text-[10px] text-amber-700">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>Margen de respaldo del 50% (faltan recetas/productos activos).</span>
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Ventas vs. equilibrio</span>
            <span className="font-semibold">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-4 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                reached ? 'bg-emerald-500' : progressPct < 50 ? 'bg-red-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(2, progressPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>${monthlySales.toFixed(2)}</span>
            <span>${breakevenRevenue.toFixed(2)}</span>
          </div>
        </div>

        {reached ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              Equilibrio alcanzado. Excedente: <span className="font-mono font-bold">+${surplus.toFixed(2)}</span>
            </p>
          </div>
        ) : (
          <div className={`flex items-center gap-2 rounded-md border p-2 ${
            progressPct < 50 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <AlertCircle className={`h-4 w-4 flex-shrink-0 ${progressPct < 50 ? 'text-red-600' : 'text-amber-600'}`} />
            <p className={`text-xs ${progressPct < 50 ? 'text-red-700' : 'text-amber-700'}`}>
              Faltan <span className="font-mono font-bold">${missing.toFixed(2)}</span> para cubrir costos fijos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}