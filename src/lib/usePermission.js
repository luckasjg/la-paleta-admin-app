import { useAuth } from "@/lib/AuthContext";
import { hasPermission } from "@/lib/permissions";

// Hook principal para verificar permisos en componentes.
// Uso: const { can, isAdmin, user } = usePermission();
//      can("inventario", "edit") -> true/false
export function usePermission() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const can = (moduleKey, action = "view") => hasPermission(user, moduleKey, action);

  return { can, isAdmin, user };
}