import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, Lock, Unlock, ChevronLeft, ChevronRight, Tags, Repeat } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpensesTable from '@/components/expenses/ExpensesTable';
import BreakevenAnalysis from '@/components/expenses/BreakevenAnalysis';
import ExpenseCategoryManager from '@/components/expenses/ExpenseCategoryManager';
import { useExpenseCategories } from '@/lib/useExpenseCategories';
import { useAverageMargin } from '@/lib/useAverageMargin';
import moment from 'moment';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Build a virtual list of expense "rows" for the given month, including:
 *   - expenses created exactly in (year, month)
 *   - recurring expenses created BEFORE/AT (year, month) that are still active
 *
 * A row is { expense, displayDate, isProjection } where displayDate is the
 * date used in the table (real for the origin month, first-of-month for projections).
 */
function buildMonthRows(expenses, year, month) {
  const monthStart = moment({ year, month }).startOf('month');
  const monthEnd = moment({ year, month }).endOf('month');

  const rows = [];
  expenses.forEach(e => {
    if (!e.date) return;
    const created = moment(e.date);

    // Real (origin month) record
    if (created.year() === year && created.month() === month) {
      rows.push({ expense: e, displayDate: e.date, isProjection: false });
      return;
    }

    // Recurring projection for a future month
    if (e.is_recurring && e.recurring_active !== false && created.isBefore(monthEnd)) {
      if (e.recurring_end_date) {
        const endDate = moment(e.recurring_end_date);
        if (monthStart.isAfter(endDate, 'month')) return;
      }
      rows.push({
        expense: e,
        displayDate: monthStart.format('YYYY-MM-DD'),
        isProjection: true,
      });
    }
  });

  // Sort: real first by date desc, then projections
  rows.sort((a, b) => {
    if (a.isProjection !== b.isProjection) return a.isProjection ? 1 : -1;
    return moment(b.displayDate).valueOf() - moment(a.displayDate).valueOf();
  });
  return rows;
}

export default function ExpensesManager() {
  const qc = useQueryClient();
  const [year, setYear] = useState(moment().year());
  const [month, setMonth] = useState(moment().month());
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { categories, addCategory, renameCategory, deleteCategory } = useExpenseCategories();

  // ── Data ──
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 1000),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-sale_date', 2000),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDialogOpen(false); setEditing(null); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDialogOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const handleSubmit = (data) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const handleDelete = (e) => {
    const msg = e.is_recurring
      ? `Eliminar "${e.description}" eliminará también todas sus proyecciones futuras. ¿Continuar?`
      : `¿Eliminar el gasto "${e.description}"?`;
    if (window.confirm(msg)) deleteMut.mutate(e.id);
  };

  // ── Month rows (real + recurring projections) ──
  const monthRows = useMemo(() => buildMonthRows(expenses, year, month), [expenses, year, month]);

  const filteredRows = useMemo(() => {
    return monthRows.filter(r => {
      if (typeFilter !== 'all' && r.expense.type !== typeFilter) return false;
      if (search && !r.expense.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [monthRows, typeFilter, search]);

  // ── Aggregates for the month ──
  const fixedTotal = useMemo(
    () => monthRows.filter(r => r.expense.type === 'fijo').reduce((s, r) => s + (r.expense.amount || 0), 0),
    [monthRows]
  );
  const variableTotal = useMemo(
    () => monthRows.filter(r => r.expense.type === 'variable').reduce((s, r) => s + (r.expense.amount || 0), 0),
    [monthRows]
  );
  const grandTotal = fixedTotal + variableTotal;
  const recurringCount = monthRows.filter(r => r.isProjection).length;

  const monthlySales = useMemo(() => sales
    .filter(s => {
      if (!s.sale_date) return false;
      const d = moment(s.sale_date);
      return d.year() === year && d.month() === month;
    })
    .filter(s => !(s.items || []).some(it => it.product_name?.startsWith('[TEST]')))
    .reduce((sum, s) => sum + (s.total || 0), 0),
  [sales, year, month]);

  // ── Average margin from Profitability Matrix logic ──
  const marginInfo = useAverageMargin({ recipes, products, supplies, fixedServiceCosts: 0 });

  // ── Category usage count (across ALL expenses, all months) ──
  const categoryUsage = (catName) => expenses.filter(e => e.category === catName).length;

  // Month navigation
  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const hasAnyCategory = (categories.fijo?.length || 0) + (categories.variable?.length || 0) > 0;

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Gastos y Punto de Equilibrio"
        description="Panel financiero conectado con Recetas, Productos e Inventario"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
              <Tags className="h-4 w-4" /> Categorías
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={!hasAnyCategory}>
              <Plus className="h-4 w-4" /> Nuevo Gasto
            </Button>
          </div>
        }
      />

      {/* Month selector */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-base font-semibold tracking-tight min-w-[140px] text-center">
              {monthLabel}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setYear(moment().year()); setMonth(moment().month()); }}
          >
            Mes actual
          </Button>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gastos Fijos (Mes)"
          value={`$${fixedTotal.toFixed(2)}`}
          icon={Lock}
          subtitle={`${monthRows.filter(r => r.expense.type === 'fijo').length} ítems`}
        />
        <StatCard
          title="Gastos Variables (Mes)"
          value={`$${variableTotal.toFixed(2)}`}
          icon={Unlock}
          subtitle={`${monthRows.filter(r => r.expense.type === 'variable').length} ítems`}
        />
        <StatCard
          title="Recurrentes Activos"
          value={recurringCount.toString()}
          icon={Repeat}
          subtitle="aplicados este mes"
        />
        <StatCard
          title="Total / Ventas"
          value={`$${grandTotal.toFixed(2)}`}
          icon={Wallet}
          subtitle={`Ventas: $${monthlySales.toFixed(2)}`}
        />
      </div>

      {/* Breakeven analysis */}
      <BreakevenAnalysis
        fixedExpenses={fixedTotal}
        marginPct={marginInfo.marginPct}
        marginInfo={marginInfo}
        monthlySales={monthlySales}
        monthLabel={monthLabel}
      />

      {/* Expenses list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Gastos Registrados — {monthLabel}
              <span className="text-[11px] text-muted-foreground font-normal ml-1">
                (incluye recurrentes activos)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar descripción..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-48 text-sm"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fijo">Fijos</SelectItem>
                  <SelectItem value="variable">Variables</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ExpensesTable
            rows={filteredRows}
            onEdit={(e) => { setEditing(e); setDialogOpen(true); }}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <ExpenseForm
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        onSubmit={handleSubmit}
        initialValue={editing}
        categories={categories}
      />

      <ExpenseCategoryManager
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        addCategory={addCategory}
        renameCategory={renameCategory}
        deleteCategory={deleteCategory}
        usageCount={categoryUsage}
      />
    </div>
  );
}