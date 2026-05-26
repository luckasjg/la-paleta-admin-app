import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { LEGACY_METHODS, getIconComponent } from '@/lib/paymentMethods';

// Hook centralizado para consumir los métodos de pago.
// - Carga desde la entidad PaymentMethod.
// - Si la BD está vacía, hace seed automático de los 5 legacy (una sola vez).
// - Expone también el shape clásico {value,label,icon,defaultCurrency} para el POS.
export function usePaymentMethods({ activeOnly = false } = {}) {
  const qc = useQueryClient();
  const seededRef = useRef(false);

  const query = useQuery({
    queryKey: ['payment_methods'],
    queryFn: () => base44.entities.PaymentMethod.list('sort_order'),
  });

  // Seed: si está cargado y no hay registros, creamos los legacy.
  useEffect(() => {
    if (seededRef.current) return;
    if (query.isLoading) return;
    if (!Array.isArray(query.data)) return;
    if (query.data.length > 0) return;
    seededRef.current = true;
    (async () => {
      try {
        for (const m of LEGACY_METHODS) {
          await base44.entities.PaymentMethod.create(m);
        }
        qc.invalidateQueries({ queryKey: ['payment_methods'] });
      } catch (e) {
        console.error('Seed PaymentMethod falló:', e);
      }
    })();
  }, [query.isLoading, query.data, qc]);

  const list = Array.isArray(query.data) ? query.data : [];
  const visible = activeOnly ? list.filter(m => m.is_active !== false) : list;

  // Shape clásico para componentes legacy (POS / MixedPaymentDialog / WalletForm).
  const asPosMethods = visible.map(m => ({
    value: m.value,
    label: m.label,
    icon: getIconComponent(m.icon),
    defaultCurrency: m.currency,
  }));

  return {
    methods: list,
    activeMethods: list.filter(m => m.is_active !== false),
    posMethods: asPosMethods,
    isLoading: query.isLoading,
  };
}