import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ROLE_OPTIONS = [
  { value: "admin",   label: "Administrador", hint: "Acceso total, incluida Configuración" },
  { value: "gerente", label: "Gerente",       hint: "Opera los módulos habilitados, sin Configuración" },
  { value: "user",    label: "Cajero",        hint: "Sólo los módulos habilitados" },
];

export default function RoleSelector({ value, onChange, disabled = false }) {
  const current = ROLE_OPTIONS.find((r) => r.value === value);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Rol del usuario</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-72">
          <SelectValue placeholder="Selecciona un rol" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && <p className="text-xs text-muted-foreground">{current.hint}</p>}
    </div>
  );
}