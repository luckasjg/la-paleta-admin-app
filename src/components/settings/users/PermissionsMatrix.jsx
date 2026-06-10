import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSION_MODULES, PERMISSION_ACTIONS } from "@/lib/permissions";
import { Eye, Pencil, Trash2 } from "lucide-react";

const ACTION_META = {
  view:   { label: "Ver",      icon: Eye },
  edit:   { label: "Editar",   icon: Pencil },
  delete: { label: "Eliminar", icon: Trash2 },
};

/**
 * Matriz interactiva de permisos para un usuario.
 * permissions: { [moduleKey]: { view, edit, delete } }
 * onChange: (newPermissions) => void
 */
export default function PermissionsMatrix({ permissions = {}, onChange, disabled = false }) {
  const toggle = (moduleKey, action) => {
    const current = permissions[moduleKey] || { view: false, edit: false, delete: false };
    const nextVal = !current[action];
    const next = { ...current, [action]: nextVal };

    // Reglas de coherencia:
    // - Si activas edit o delete, view se enciende automáticamente.
    // - Si apagas view, también apagas edit y delete.
    if ((action === "edit" || action === "delete") && nextVal) next.view = true;
    if (action === "view" && !nextVal) { next.edit = false; next.delete = false; }

    onChange({ ...permissions, [moduleKey]: next });
  };

  const toggleAllForModule = (moduleKey, value) => {
    onChange({
      ...permissions,
      [moduleKey]: { view: value, edit: value, delete: value },
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">Módulo</th>
            {PERMISSION_ACTIONS.map((a) => {
              const Icon = ACTION_META[a].icon;
              return (
                <th key={a} className="p-3 font-medium text-center w-24">
                  <div className="flex items-center justify-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {ACTION_META[a].label}
                  </div>
                </th>
              );
            })}
            <th className="p-3 font-medium text-center w-20">Todo</th>
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MODULES.map((mod) => {
            const modPerms = permissions[mod.key] || { view: false, edit: false, delete: false };
            const allOn = modPerms.view && modPerms.edit && modPerms.delete;
            return (
              <tr key={mod.key} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{mod.label}</td>
                {PERMISSION_ACTIONS.map((a) => (
                  <td key={a} className="p-3 text-center">
                    <Checkbox
                      checked={Boolean(modPerms[a])}
                      onCheckedChange={() => toggle(mod.key, a)}
                      disabled={disabled}
                    />
                  </td>
                ))}
                <td className="p-3 text-center">
                  <Checkbox
                    checked={allOn}
                    onCheckedChange={(v) => toggleAllForModule(mod.key, Boolean(v))}
                    disabled={disabled}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}