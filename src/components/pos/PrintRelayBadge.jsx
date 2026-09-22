import { Printer, PrinterCheck } from 'lucide-react';

/** Indicador de si la impresión saldrá directa (relay local) o por diálogo. */
export default function PrintRelayBadge({ available, checking }) {
  if (checking) return null;

  return available ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
      <PrinterCheck className="h-3 w-3" /> Impresión directa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
      <Printer className="h-3 w-3" /> Modo diálogo
    </span>
  );
}