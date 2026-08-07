// Definición central de módulos de la app para el sistema de permisos granular.
// Cada módulo tiene una key (interna), label (UI) y path (ruta).
// Las acciones disponibles por módulo son: view, edit, delete.

export const PERMISSION_MODULES = [
  { key: "dashboard",      label: "Dashboard",         path: "/" },
  { key: "pos",            label: "Punto de Venta",    path: "/pos" },
  { key: "inventario",     label: "Inventario",        path: "/inventario" },
  { key: "recetas",        label: "Recetas",           path: "/recetas" },
  { key: "preparados",     label: "Preparados",        path: "/preparados" },
  { key: "produccion",     label: "Producción",        path: "/produccion" },
  { key: "productos",      label: "Productos",         path: "/productos" },
  { key: "caja",           label: "Caja",              path: "/caja" },
  { key: "ajustes",        label: "Ajustes",           path: "/ajustes" },
  { key: "transferencias", label: "Transferencias",    path: "/transferencias" },
  { key: "auditorias",     label: "Auditorías",        path: "/auditorias" },
  { key: "rentabilidad",   label: "Rentabilidad",      path: "/rentabilidad" },
  { key: "gastos",         label: "Gastos",            path: "/gastos" },
  { key: "billeteras",     label: "Billeteras",        path: "/billeteras" },
  { key: "configuracion",  label: "Configuración",     path: "/configuracion" },
];

export const PERMISSION_ACTIONS = ["view", "edit", "delete"];

// Construye una matriz vacía (todo false) para inicializar nuevos usuarios.
export function buildEmptyPermissionsMatrix() {
  const matrix = {};
  for (const mod of PERMISSION_MODULES) {
    matrix[mod.key] = { view: false, edit: false, delete: false };
  }
  return matrix;
}

// Verifica si el usuario tiene un permiso específico.
// Los admins siempre tienen todos los permisos.
export function hasPermission(user, moduleKey, action = "view") {
  if (!user) return false;
  if (user.role === "admin") return true;
  // Los permisos pueden venir en la raíz del usuario o anidados en `data`,
  // según cómo la plataforma devuelva los campos personalizados.
  const perms = user.permissions || user.data?.permissions || {};
  const modulePerms = perms[moduleKey] || {};
  return Boolean(modulePerms[action]);
}