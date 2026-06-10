import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, KeyRound } from "lucide-react";
import UserPermissionsDialog from "./UserPermissionsDialog";

export default function UsersManagerCard() {
  const [editing, setEditing] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const countActivePermissions = (u) => {
    const p = u.permissions || {};
    let n = 0;
    for (const k of Object.keys(p)) {
      const m = p[k] || {};
      if (m.view || m.edit || m.delete) n++;
    }
    return n;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios y Permisos
            </CardTitle>
            <CardDescription>
              Define qué módulos puede ver, editar o eliminar cada usuario.
              Para invitar nuevos usuarios usa el panel de Base44.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay usuarios registrados aún.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Usuario</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Rol</th>
                  <th className="text-left p-3 font-medium">Módulos habilitados</th>
                  <th className="text-right p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isAdmin = u.role === "admin";
                  const activeCount = countActivePermissions(u);
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-3 font-medium">{u.full_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        {isAdmin ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                            <Shield className="w-3 h-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">{u.role || "user"}</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">Acceso total</span>
                        ) : activeCount === 0 ? (
                          <span className="text-xs text-destructive">Sin acceso configurado</span>
                        ) : (
                          <span className="text-xs">{activeCount} módulo(s) habilitado(s)</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditing(u)} className="gap-2">
                          <KeyRound className="w-3.5 h-3.5" />
                          Permisos
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <UserPermissionsDialog
        user={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}