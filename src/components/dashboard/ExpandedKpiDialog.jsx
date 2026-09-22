import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { KPI_VIEWS } from './kpiRegistry';
import { exportElementToPdf, waitForRender } from '@/lib/dashboardPdf';

/** Vista ampliada de un KPI: gráfico grande, tablas de datos y desglose + PDF. */
export default function ExpandedKpiDialog({ viewKey, ctx, onClose }) {
  const view = viewKey ? KPI_VIEWS[viewKey] : null;
  const contentRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const subtitle = view ? view.period(ctx) : '';

  const handleExport = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      await waitForRender(300);
      await exportElementToPdf(contentRef.current, {
        title: `${view.title} — ${subtitle}`,
        subtitle: moment().format('DD/MM/YYYY'),
        fileName: `${view.title.replace(/[^\w]+/g, '_')}_${moment().format('YYYYMMDD')}.pdf`,
      });
      toast.success('PDF descargado');
    } catch (e) {
      toast.error(e.message || 'No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={!!view} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] xl:max-w-6xl w-full max-h-[92vh] !flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="text-lg">{view?.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generando...</>
                : <><FileDown className="h-4 w-4 mr-1" /> Exportar PDF</>}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-background">
          <div ref={contentRef} className="bg-background space-y-6">
            {view && view.render(ctx)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}