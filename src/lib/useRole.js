import { useAuth } from '@/lib/AuthContext';

// Lista de correos con rol de administrador.
// Agrega o quita correos aquí para cambiar los administradores.
export const ADMIN_EMAILS = [
  'luckasjimenez@gmail.com',
  'alimentos_smh9@outlook.com',
];

/**
 * Hook centralizado para Control de Acceso Basado en Roles (RBAC).
 * Devuelve el usuario, su rol y banderas booleanas para usar en la UI.
 */
export function useRole() {
  const { user } = useAuth();
  const email = (user?.email || '').toLowerCase();
  const isAdmin = !!email && ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);
  const role = isAdmin ? 'ADMIN' : 'CAJERO';
  return { user, role, isAdmin, isCajero: !isAdmin };
}