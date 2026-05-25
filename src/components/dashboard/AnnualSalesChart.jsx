import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AnnualSalesChart({ sales, selectedYear, selectedMonth, onSelectMonth, onChangeYear }) {
  const data = useMemo(() => {
    const totals = Array(12).fill(0);
    const counts = Array(12).fill(0);
    sales.forEach(s => {
      if (!s.sale_date) return;
      const m = moment(s.sale_date);
      if (m.year() !== selectedYear) return;
      totals[m.month()] += s.total || 0;
      counts[m.month()] += 1;
    });
    return MONTHS.map((name, idx) => ({
      name,
      idx,
      ventas: totals[idx],
      transacciones: counts[idx],
    }));
  }, [sales, selectedYear]);

  const yearTotal = data.reduce((sum, d) => sum + d.ventas, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Ventas Anuales {selectedYear} · Total: <span className="text-primary">${yearTotal.toFixed(2)}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChangeYear(selectedYear - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{selectedYear}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChangeYear(selectedYear + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Haz clic en una barra para filtrar el detalle del mes
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(v, _n, p) => [`$${Number(v).toFixed(2)}`, `${p.payload.transacciones} ventas`]}
              labelFormatter={(l) => `${l} ${selectedYear}`}
            />
            <Bar
              dataKey="ventas"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(d) => onSelectMonth(d.idx)}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.idx}
                  fill={entry.idx === selectedMonth ? 'hsl(0,55%,30%)' : 'hsl(152,35%,38%)'}
                  stroke={entry.idx === selectedMonth ? 'hsl(0,55%,20%)' : 'transparent'}
                  strokeWidth={entry.idx === selectedMonth ? 2 : 0}
                  fillOpacity={entry.idx === selectedMonth ? 1 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}