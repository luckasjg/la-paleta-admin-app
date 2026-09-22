import React from 'react';
import { KPI_VIEWS } from './kpiRegistry';
import { PDF_RENDER_WIDTH } from '@/lib/dashboardPdf';

/**
 * Renderiza las secciones elegidas fuera de la pantalla, con un ancho fijo
 * equivalente al de una página A4, para que html2canvas las capture con los
 * gráficos ya medidos (no se puede usar display:none: los gráficos quedarían
 * sin tamaño).
 */
export default function DashboardPdfReport({ sectionKeys, ctx, registerRef }) {
  if (!sectionKeys || sectionKeys.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: -20000,
        width: PDF_RENDER_WIDTH,
        background: '#ffffff',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {sectionKeys.map(key => {
        const view = KPI_VIEWS[key];
        if (!view) return null;
        return (
          <div
            key={key}
            ref={(el) => registerRef(key, el)}
            style={{ width: PDF_RENDER_WIDTH, background: '#ffffff', padding: 16 }}
            className="space-y-5"
          >
            {view.render(ctx)}
          </div>
        );
      })}
    </div>
  );
}