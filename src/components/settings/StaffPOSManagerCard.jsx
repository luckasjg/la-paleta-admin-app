import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Pencil, Plus, Trash2, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRole } from '@/lib/useRole';

const emptyStaff = { full_name: '', pin: '', is_active: true, notes: '' };

export default function StaffPOSManagerCard() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyStaff);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff_pos'],
    queryFn: () => base44.entities.StaffPOS.list(),
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.StaffPOS.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff_pos'] }); close(); toast.success('Empleado creado'); },
    onError: (e) => toast.error(e.message || 'Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffPOS.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff_pos'] }); close(); toast.success('Empleado actualizado'); },
    onError: (e) => toast.error(e.message || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.StaffPOS.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff_pos'] }); toast.success('Empleado eliminado'); },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.StaffPOS.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff_pos'] }),
  });

  const close = () => { setOpen(false); setEditing(null); setForm(emptyStaff); };

  const openCreate = () => { setEditing(null); setForm(emptyStaff); setOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ full_name: s.full_name || '', pin: s.pin || '', is_active: s.is_active !== false, notes: s.notes || '' });
    setOpen(true);
  };

  const handleSave = () => {
    const name = form.full_name.trim();
    const pin = (form.pin || '').trim();
    if (!name) return toast.error('Nombre requerido');
    if (!/^\d{4,6}$/.test(pin)) return toast.error('El PIN debe tener entre 4 y 6 dígitos');
    // Validar PIN único (excepto el propio en edición)
    const duplicate = staff.find(s => s.pin === pin && s.id !== editing?.id);
    if (duplicate) return toast.error('Ese PIN ya está asignado a otro empleado');
    const payload = { full_name: name, pin, is_active: form.is_active, notes: form.notes || '' };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Personal del POS (PINs)
          </CardTitle>
          <CardDescription>
            Empleados autorizados a abrir caja. El PIN se solicita al iniciar cada sesión de caja.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay empleados registrados aún.
          </p>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                <UserCircle2 className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{s.full_name}</span>
                    {s.is_active === false && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">PIN: {'•'.repeat(s.pin?.length || 4)}</p>
                </div>
                <Switch
                  checked={s.is_active !== false}
                  onCheckedChange={(v) => toggleActiveMut.mutate({ id: s.id, is_active: v })}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => { if (confirm(`¿Eliminar a ${s.full_name}?`)) deleteMut.mutate(s.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => o ? setOpen(o) : close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar empleado' : 'Nuevo empleado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ej. María Pérez" />
            </div>
            <div>
              <Label>PIN (4-6 dígitos)</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="Ej. 1234"
                className="font-mono tracking-widest text-center"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-2">
              <Label className="text-sm">Activo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Turno mañana, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}