import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wallet, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpensesTable from '@/components/expenses/ExpensesTable';
import BreakevenAnalysis from '@/components/expenses/BreakevenAnalysis';
import moment from 'moment';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MARGIN_KEY = 'expenses_avg_margin_pct';

export default function ExpensesManager() {
  const qc = useQueryClient();
  const [year, setYear] = useState(moment().year());
  const [month, setMonth] = useState(moment().month());
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [marginPct, setMarginPct] = useState(() => {
    const saved = localStorage.getItem(MARGIN_KEY);
    return saved ? parseFloat(saved) : 60;
  });

  const updateMargin = (v) => {
    setMarginPct(v);
    localStorage.setItem(MARGIN_KEY, String(v));
  };

  // ── Data ──
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-sale_date', 2000),
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
    if (window.confirm(`¿Eliminar el gasto "${e.description}"?`)) deleteMut.mutate(e.id);
  };

  // ── Filtering ──
  const monthExpenses = useMemo(() => expenses.filter(e => {
    if (!e.date) return false;
    const d = moment(e.date);
    return d.year() === year && d.month() === month;
  }), [expenses, year, month]);

  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [monthExpenses, typeFilter, search]);

  // ── Aggregates ──
  const fixedTotal = useMemo(
    () => monthExpenses.filter(e => e.type === 'fijo').reduce((s, e) => s + (e.amount || 0), 0),
    [monthExpenses]
  );
  const variableTotal = useMemo(
    () => monthExpenses.filter(e => e.type === 'variable').reduce((s, e) => s + (e.amount || 0), 0),
    [monthExpenses]
  );
  const grandTotal = fixedTotal + variableTotal;

  const monthlySales = useMemo(() => sales
    .filter(s => {
      if (!s.sale_date) return false;
      const d = moment(s.sale_date);
      return d.year() === year && d.month() === month;
    })
    .filter(s => !(s.items || []).some(it => it.product_name?.startsWith('[TEST]')))
    .reduce((sum, s) => sum + (s.total || 0), 0),
  [sales, year, month]);

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

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader
        title="Gastos y Punto de Equilibrio"
        description="Registra los gastos del negocio y monitorea el umbral de rentabilidad"
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuevo Gasto
          </Button>
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
          subtitle={`${monthExpenses.filter(e => e.type === 'fijo').length} gastos`}
        />
        <StatCard
          title="Gastos Variables (Mes)"
          value={`$${variableTotal.toFixed(2)}`}
          icon={Unlock}
          subtitle={`${monthExpenses.filter(e => e.type === 'variable').length} gastos`}
        />
        <StatCard
          title="Total Gastos"
          value={`$${grandTotal.toFixed(2)}`}
          icon={Wallet}
          subtitle={`${monthExpenses.length} registros`}
        />
        <StatCard
          title="Ventas del Mes"
          value={`$${monthlySales.toFixed(2)}`}
          icon={Wallet}
          subtitle="ingreso bruto"
        />
      </div>

      {/* Breakeven analysis */}
      <BreakevenAnalysis
        fixedExpenses={fixedTotal}
        marginPct={marginPct}
        onMarginChange={updateMargin}
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
            expenses={filteredExpenses}
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
      />
    </div>
  );
}