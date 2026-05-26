import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LEGACY_METHODS, getIconComponent } from '@/lib/paymentMethods';

// Lock GLOBAL fuera de React: garantiza que el seed corra UNA sola vez por sesión,
// aunque el hook se monte en múltiples componentes en paralelo.
let seedPromise = null;

async function ensureSeed(qc) {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    // Re-leer en el momento del seed (no fiarse de cache) para evitar duplicados.
    const fresh = await base44.entities.PaymentMethod.list();
    const existingValues = new Set((fresh || []).map(m => m.value));
    for (const m of LEGACY_METHODS) {
      if (!existingValues.has(m.value)) {
        await base44.entities.PaymentMethod.create(m);
        existingValues.add(m.value);
      }
    }
    qc.invalidateQueries({ queryKey: ['payment_methods'] });
  })().catch((e) => {
    console.error('Seed PaymentMethod falló:', e);
    seedPromise = null; // permitir reintento si falló
  });
  return seedPromise;
}

// Hook centralizado para consumir los métodos de pago.
export function usePaymentMethods({ activeOnly = false } = {}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['payment_methods'],
    queryFn: () => base44.entities.PaymentMethod.list('sort_order'),
  });

  // Seed sólo si terminó de cargar y la BD está realmente vacía.
  useEffect(() => {
    if (query.isLoading) return;
    if (!Array.isArray(query.data)) return;
    if (query.data.length > 0) return;
    ensureSeed(qc);
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