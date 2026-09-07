import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionsMatrix from "./PermissionsMatrix";
import RoleSelector from "./RoleSelector";
import { buildEmptyPermissionsMatrix, PERMISSION_MODULES } from "@/lib/permissions";
import { useRole } from "@/lib/useRole";

// Módulos operativos que un gerente maneja por defecto (sin Configuración).
const GERENTE_MODULES = [
  "dashboard", "pos", "inventario", "recetas", "preparados", "produccion",
  "productos", "pedidos", "caja", "ajustes", "transferencias", "auditorias",
  "rentabilidad", "gastos", "billeteras", "asesor",
];

export default function UserPermissionsDialog({ user, open, onClose }) {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [permissions, setPermissions] = useState({});
  const [role, setRole] = useState("user");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPermissions({ ...buildEmptyPermissionsMatrix(), ...(user.permissions || user.data?.permissions || {}) });
      setRole(user.role || "user");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = { permissions };
      if (isAdmin && role !== user.role) payload.role = role;
      await base44.entities.User.update(user.id, payload);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Permisos actualizados");
      onClose();
    } catch (e) {
      toast.error("Error guardando permisos: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const setPreset = (preset) => {
    const matrix = buildEmptyPermissionsMatrix();
    if (preset === "all") {
      for (const m of PERMISSION_MODULES) matrix[m.key] = { view: true, edit: true, delete: true };
    } else if (preset === "gerente") {
      for (const key of GERENTE_MODULES) matrix[key] = { view: true, edit: true, delete: false };
    } else if (preset === "cashier") {
      matrix.pos  = { view: true, edit: true, delete: false };
      matrix.caja = { view: true, edit: true, delete: false };
    } else if (preset === "production") {
      matrix.produccion = { view: true, edit: true, delete: false };
      matrix.recetas    = { view: true, edit: false, delete: false };
      matrix.preparados = { view: true, edit: false, delete: false };
      matrix.inventario = { view: true, edit: false, delete: false };
    } else if (preset === "viewer") {
      for (const m of PERMISSION_MODULES) matrix[m.key] = { view: true, edit: false, delete: false };
    }
    setPermissions(matrix);
  };

  if (!user) return null;

  const showMatrix = role !== "admin";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Elige el rol y, para gerentes y cajeros, qué módulos puede ver, editar o eliminar.
            Los administradores siempre tienen acceso total.
          </DialogDescription>
        </DialogHeader>

        <RoleSelector value={role} onChange={setRole} disabled={!isAdmin} />

        {!showMatrix ? (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            Este usuario es <strong>Administrador</strong> y tiene acceso total al sistema.
            No es necesario configurar permisos granulares.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs text-muted-foreground self-center mr-2">Plantillas rápidas:</span>
              <Button variant="outline" size="sm" onClick={() => setPreset("gerente")}>Gerente</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("cashier")}>Cajero</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("production")}>Producción</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("viewer")}>Sólo lectura</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("all")}>Todo</Button>
              <Button variant="ghost" size="sm" onClick={() => setPermissions(buildEmptyPermissionsMatrix())}>Limpiar</Button>
            </div>
            <PermissionsMatrix permissions={permissions} onChange={setPermissions} />
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}