import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Lee y escribe un ajuste de tienda guardado en la entidad ShopSetting.
 * A diferencia de localStorage, esto sí es visible desde cualquier dispositivo
 * (necesario para el menú móvil público de los clientes).
 */
export function useShopSetting(key) {
  const [value, setValue] = useState('');
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await base44.entities.ShopSetting.filter({ key });
      const row = (rows || [])[0] || null;
      setRecord(row);
      setValue(row?.value || '');
    } catch {
      // Sin conexión: se mantiene el valor vacío y se reintenta al recargar.
    }
    setIsLoading(false);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (newValue) => {
      const clean = String(newValue || '').trim();
      if (record) {
        const updated = await base44.entities.ShopSetting.update(record.id, { value: clean });
        setRecord(updated);
      } else {
        const created = await base44.entities.ShopSetting.create({ key, value: clean });
        setRecord(created);
      }
      setValue(clean);
    },
    [key, record]
  );

  return { value, isLoading, save };
}