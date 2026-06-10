import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/lib/usePermission';

/**
 * Protege una ruta exigiendo un permiso específico (view por defecto).
 * Si el usuario no lo tiene:
 *   - Admin siempre pasa (hasPermission lo resuelve).
 *   - Usuarios sin acceso se redirigen al fallback (por defecto /pos).
 */
export default function RequirePermission({ module, action = 'view', fallbackPath = '/pos', children }) {
  const { can, user } = usePermission();
  const navigate = useNavigate();
  const allowed = can(module, action);

  useEffect(() => {
    if (user && !allowed) navigate(fallbackPath, { replace: true });
  }, [user, allowed, navigate, fallbackPath]);

  if (!allowed) return null;
  return children;
}