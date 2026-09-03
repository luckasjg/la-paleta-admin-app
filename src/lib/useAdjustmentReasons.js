import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Motivos base sembrados en la entidad AdjustmentReason.
export const DEFAULT_REASONS = [
  { value: 'derrame', label: 'Derrame' },
  { value: 'producto_dañado', label: 'Producto Dañado' },
  { value: 'conteo_fisico', label: 'Conteo Físico' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Motivos de ajuste activos, administrables por el admin.
 * Si aún no hay registros, cae en los motivos predeterminados.
 */
export function useAdjustmentReasons() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['adjustment_reasons'],
    queryFn: () => base44.entities.AdjustmentReason.list(),
  });

  const active = data.filter(r => r.is_active !== false);
  return { reasons: active.length > 0 ? active : DEFAULT_REASONS, isLoading, raw: data };
}

/** Etiqueta legible de un motivo, con fallback al valor crudo del historial. */
export function reasonLabel(value, reasons = []) {
  const all = [...reasons, ...DEFAULT_REASONS];
  return all.find(r => r.value === value)?.label || value;
}