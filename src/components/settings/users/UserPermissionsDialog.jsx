import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PermissionsMatrix from "./PermissionsMatrix";
import { buildEmptyPermissionsMatrix, PERMISSION_MODULES } from "@/lib/permissions";

export default function UserPermissionsDialog({ user, open, onClose }) {
  const qc = useQueryClient();
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPermissions({ ...buildEmptyPermissionsMatrix(), ...(user.permissions || {}) });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await base44.entities.User.update(user.id, { permissions });
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Configura qué módulos puede ver, editar o eliminar este usuario.
            Los administradores siempre tienen acceso total.
          </DialogDescription>
        </DialogHeader>

        {user.role === "admin" ? (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            Este usuario es <strong>Administrador</strong> y tiene acceso total al sistema.
            No es necesario configurar permisos granulares.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs text-muted-foreground self-center mr-2">Plantillas rápidas:</span>
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
          {user.role !== "admin" && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar permisos"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}