import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/lib/useRole';

/**
 * Envuelve una página que solo deben ver administradores.
 * Si un cajero entra a la URL directamente, se le redirige a /pos.
 */
export default function RequireAdmin({ children }) {
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) navigate('/pos', { replace: true });
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  return children;
}