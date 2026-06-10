import React from "react";
import { usePermission } from "@/lib/usePermission";

// Envuelve elementos de UI que requieren un permiso.
// Si el usuario no tiene el permiso, no se renderiza nada (o el fallback).
//
// Uso:
//   <PermissionGate module="inventario" action="edit">
//     <Button>Editar</Button>
//   </PermissionGate>
export default function PermissionGate({ module, action = "view", fallback = null, children }) {
  const { can } = usePermission();
  if (!can(module, action)) return fallback;
  return <>{children}</>;
}