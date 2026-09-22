import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { KPI_VIEWS } from './kpiRegistry';
import DashboardPdfReport from './DashboardPdfReport';
import { exportDashboardToPdf, waitForRender } from '@/lib/dashboardPdf';

/** Secciones ofrecidas en el PDF consolidado, en el orden en que se imprimen. */
const SECTIONS = [
  { key: 'hoy', hint: 'Tickets del día y comparación con ayer' },
  { key: 'semana', hint: 'Tendencia de los últimos 7 días' },
  { key: 'mes', hint: 'KPIs del mes y detalle día por día' },
  { key: 'financiero', hint: 'Ingreso, costo, ganancia y margen' },
  { key: 'equilibrio', hint: 'Gastos fijos y avance del equilibrio' },
  { key: 'anual', hint: 'Serie mensual y comparación interanual' },
  { key: 'productos', hint: 'Ranking completo de productos' },
  { key: 'pagos', hint: 'Acumulado por método de pago' },
  { key: 'horas', hint: 'Ingresos por hora y por turno' },
  { key: 'dias', hint: 'Ingresos por día de la semana' },
  { key: 'divisa', hint: 'Saldos en bolívares y diferencial' },
  { key: 'bandejas', hint: 'Existencias de helado por bandeja' },
  { key: 'stock', hint: 'Insumos bajo el mínimo' },
];

const DEFAULT_SELECTION = ['mes', 'financiero', 'equilibrio', 'anual', 'productos', 'pagos', 'horas', 'dias'];

export default function DashboardExporter({ ctx }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(DEFAULT_SELECTION);
  const [renderKeys, setRenderKeys] = useState(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef({});

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  const orderedSelection = SECTIONS.filter(s => selected.includes(s.key)).map(s => s.key);

  const startExport = () => {
    if (orderedSelection.length === 0) {
      toast.error('Selecciona al menos una sección');
      return;
    }
    setBusy(true);
    refs.current = {};
    setRenderKeys(orderedSelection);
  };

  // Cuando las secciones ocultas ya están montadas y medidas, se compila el PDF.
  useEffect(() => {
    if (!renderKeys) return;
    let cancelled = false;

    (async () => {
      try {
        await waitForRender(1100);
        if (cancelled) return;
        await exportDashboardToPdf({
          sections: renderKeys.map(key => ({
            id: key,
            title: KPI_VIEWS[key].title,
            element: refs.current[key],
          })),
          periodLabel: ctx.monthLabel,
          fileName: `Dashboard_LaPaleta_${moment({ year: ctx.selectedYear, month: ctx.selectedMonth }).format('MM-YYYY')}.pdf`,
        });
        if (!cancelled) toast.success('PDF del dashboard descargado');
      } catch (e) {
        if (!cancelled) toast.error(e.message || 'No se pudo generar el PDF');
      } finally {
        if (!cancelled) {
          setRenderKeys(null);
          setBusy(false);
          setOpen(false);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKeys]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileDown className="h-4 w-4 mr-1" /> Exportar Dashboard
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Exportar indicadores a PDF</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Elige las secciones a incluir. Cada una se imprime en su propia página con
              gráficos y tablas de detalle · Periodo: <strong>{ctx.monthLabel}</strong>
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECTIONS.map(s => {
                const checked = selected.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggle(s.key)}
                    className={`flex items-start gap-2.5 text-left rounded-lg border p-3 transition-colors ${
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{KPI_VIEWS[s.key].title}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(SECTIONS.map(s => s.key))} disabled={busy}>
                Todas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={busy}>
                Ninguna
              </Button>
            </div>
            <Button onClick={startExport} disabled={busy}>
              {busy
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generando PDF...</>
                : <><FileDown className="h-4 w-4 mr-1" /> Generar PDF ({orderedSelection.length})</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardPdfReport
        sectionKeys={renderKeys}
        ctx={ctx}
        registerRef={(key, el) => { refs.current[key] = el; }}
      />
    </>
  );
}