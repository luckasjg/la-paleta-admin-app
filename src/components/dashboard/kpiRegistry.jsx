import React from 'react';
import { TodayDetail, WeekDetail, TraysDetail, LowStockDetail } from './detail/RealtimeDetails';
import { MonthKpiDetail, FinancialDetail } from './detail/MonthDetails';
import BreakEvenDetailContainer from './detail/BreakEvenDetailContainer';
import { ProductsDetail, PaymentsDetail, HourlyDetail, WeekdayDetail } from './detail/ChartDetails';
import AnnualDetail from './detail/AnnualDetail';
import CurrencyDetail from './detail/CurrencyDetail';

/**
 * Catálogo de vistas ampliadas del dashboard.
 * Cada entrada define su título, subtítulo (periodo) y cómo renderizarse con el
 * contexto de datos ya calculado en la página (sin volver a consultar ventas).
 */
export const KPI_VIEWS = {
  hoy: {
    title: 'Ventas de Hoy',
    period: () => 'Tiempo real',
    render: (ctx) => <TodayDetail analytics={ctx.analytics} />,
  },
  semana: {
    title: 'Ventas de los Últimos 7 Días',
    period: () => 'Tiempo real',
    render: (ctx) => <WeekDetail analytics={ctx.analytics} />,
  },
  bandejas: {
    title: 'Bandejas Activas',
    period: () => 'Inventario actual',
    render: (ctx) => <TraysDetail trays={ctx.trays} />,
  },
  stock: {
    title: 'Alertas de Stock',
    period: () => 'Inventario actual',
    render: (ctx) => <LowStockDetail supplies={ctx.supplies} lowStockSupplies={ctx.lowStockSupplies} />,
  },
  mes: {
    title: 'Indicadores del Mes',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <MonthKpiDetail analytics={ctx.analytics} monthLabel={ctx.monthLabel} />,
  },
  financiero: {
    title: 'Resultado Financiero',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => (
      <FinancialDetail
        analytics={ctx.analytics}
        monthLabel={ctx.monthLabel}
        grossRevenue={ctx.grossRevenue}
        cogs={ctx.cogs}
        prevCogs={ctx.prevCogs}
      />
    ),
  },
  equilibrio: {
    title: 'Punto de Equilibrio',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <BreakEvenDetailContainer ctx={ctx} />,
  },
  divisa: {
    title: 'Exposición Cambiaria (VES)',
    period: () => 'Saldos actuales',
    render: () => <CurrencyDetail />,
  },
  anual: {
    title: 'Ventas Anuales',
    period: (ctx) => `Año ${ctx.selectedYear}`,
    render: (ctx) => <AnnualDetail analytics={ctx.analytics} selectedYear={ctx.selectedYear} />,
  },
  productos: {
    title: 'Productos Más Vendidos',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <ProductsDetail analytics={ctx.analytics} monthLabel={ctx.monthLabel} />,
  },
  pagos: {
    title: 'Métodos de Pago',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <PaymentsDetail analytics={ctx.analytics} monthLabel={ctx.monthLabel} />,
  },
  horas: {
    title: 'Ventas por Hora',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <HourlyDetail analytics={ctx.analytics} monthLabel={ctx.monthLabel} />,
  },
  dias: {
    title: 'Ventas por Día de la Semana',
    period: (ctx) => ctx.monthLabel,
    render: (ctx) => <WeekdayDetail analytics={ctx.analytics} monthLabel={ctx.monthLabel} />,
  },
};