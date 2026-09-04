import { useCallback, useState } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'lapaleta_customer_profile';

const readProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Perfil del cliente del menú móvil: se guarda en el dispositivo y se
 * sincroniza con la entidad Customer mediante la función registerMenuCustomer.
 */
export function useCustomerProfile() {
  const [profile, setProfile] = useState(readProfile);

  const register = useCallback(async ({ full_name, phone, address }) => {
    const res = await base44.functions.invoke('registerMenuCustomer', {
      full_name,
      phone,
      address,
    });
    const saved = res?.data;
    if (!saved?.customer_id) throw new Error('registro incompleto');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Modo privado o almacenamiento lleno: el registro ya quedó en el servidor.
    }
    setProfile(saved);
    return saved;
  }, []);

  const forget = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que limpiar.
    }
    setProfile(null);
  }, []);

  return { profile, register, forget };
}