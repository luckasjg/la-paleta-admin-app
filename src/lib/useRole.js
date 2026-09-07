import { useAuth } from '@/lib/AuthContext';

// Administrador maestro: siempre tiene acceso total, sin importar su registro.
export const ADMIN_EMAILS = [
  'luckasjimenez@gmail.com',
];

/**
 * Hook centralizado para Control de Acceso Basado en Roles (RBAC).
 * El rol proviene del campo `role` del usuario: 'admin' | 'gerente' | 'user'.
 * - admin   → acceso total (incluida Configuración).
 * - gerente → puede operar los módulos que el admin le habilite, sin Configuración.
 * - user    → sólo los módulos habilitados en su matriz de permisos.
 */
export function useRole() {
  const { user } = useAuth();
  const email = (user?.email || '').toLowerCase();
  const isMasterAdmin = !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
  const rawRole = user?.role || 'user';
  const isAdmin = isMasterAdmin || rawRole === 'admin';
  const isGerente = !isAdmin && rawRole === 'gerente';
  const role = isAdmin ? 'ADMIN' : isGerente ? 'GERENTE' : 'CAJERO';
  return { user, role, isAdmin, isGerente, isCajero: !isAdmin && !isGerente };
}