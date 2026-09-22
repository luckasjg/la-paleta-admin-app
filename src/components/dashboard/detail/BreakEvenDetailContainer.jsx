import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { buildMonthRows, getFixedExpensesForMonth } from '@/lib/expenseProjections';
import { useAverageMargin } from '@/lib/useAverageMargin';
import { BreakEvenDetail } from './MonthDetails';

/** Carga gastos y margen promedio para la vista ampliada del punto de equilibrio. */
export default function BreakEvenDetailContainer({ ctx }) {
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000),
  });

  const marginInfo = useAverageMargin({
    recipes: ctx.recipes,
    products: ctx.products,
    supplies: ctx.supplies,
    fixedServiceCosts: 0,
  });

  const rows = buildMonthRows(expenses, ctx.selectedYear, ctx.selectedMonth).filter(r => r.expense.type === 'fijo');

  return (
    <BreakEvenDetail
      monthLabel={ctx.monthLabel}
      fixedExpenses={getFixedExpensesForMonth(expenses, ctx.selectedYear, ctx.selectedMonth)}
      expenseRows={rows}
      marginInfo={marginInfo}
      monthlySales={ctx.grossRevenue}
      daysInMonth={moment({ year: ctx.selectedYear, month: ctx.selectedMonth }).daysInMonth()}
      activeDays={ctx.analytics.activeDays}
    />
  );
}