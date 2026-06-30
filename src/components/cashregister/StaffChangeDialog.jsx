import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Delete, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { setActiveSession } from '@/lib/cashSession';

/**
 * Diálogo para cambiar el cajero y/o el turno de la sesión de caja
 * actualmente abierta. NO cierra la sesión: actualiza staff_id/staff_name/shift
 * y agrega una entrada al historial en `notes`, para que el cierre del día
 * acumule todas las ventas y el reporte impreso muestre la cronología.
 */
export default function StaffChangeDialog({ open, onOpenChange, register }) {
  const [pin, setPin] = useState('');
  const [shift, setShift] = useState(register?.shift || 'manana');
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setPin('');
      setShift(register?.shift || 'manana');
      setSubmitting(false);
    }
  }, [open, register?.shift]);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff_pos'],
    queryFn: () => base44.entities.StaffPOS.list(),
  });

  const changeMut = useMutation({
    mutationFn: async (newStaff) => {
      const now = new Date();
      const ts = moment(now).format('DD/MM HH:mm');
      const prevName = register?.staff_name || register?.operator || '—';
      const prevShift = register?.shift || '—';
      const shiftChanged = shift !== prevShift;
      const staffChanged = newStaff.id !== register?.staff_id;

      const logLine =
        `[${ts}] Cambio: ${prevName} (${prevShift}) -> ${newStaff.full_name} (${shift})`;

      const prevNotes = (register?.notes || '').trim();
      const newNotes = prevNotes ? `${prevNotes}\n${logLine}` : logLine;

      const updated = await base44.entities.CashRegister.update(register.id, {
        staff_id: newStaff.id,
        staff_name: newStaff.full_name,
        operator: newStaff.full_name,
        shift,
        notes: newNotes,
      });
      return { updated, staffChanged, shiftChanged, newStaff };
    },
    onSuccess: ({ updated, staffChanged, shiftChanged, newStaff }) => {
      setActiveSession({
        id: updated.id,
        staff_id: updated.staff_id,
        staff_name: updated.staff_name,
        shift: updated.shift,
        date: updated.date,
        opened_at: updated.opened_at,
      });
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      qc.invalidateQueries({ queryKey: ['active_cash_session'] });
      const msg = staffChanged && shiftChanged
        ? `Cambio a ${newStaff.full_name} · turno ${shift}`
        : staffChanged
          ? `Cajero actualizado: ${newStaff.full_name}`
          : `Turno actualizado: ${shift}`;
      toast.success(msg);
      onOpenChange(false);
    },
    onError: (e) => {
      setSubmitting(false);
      toast.error(e.message || 'Error al cambiar cajero');
    },
  });

  const tryChange = (currentPin) => {
    if (submitting) return;
    const match = staff.find(s => s.pin === currentPin && s.is_active !== false);
    if (!match) {
      toast.error('PIN incorrecto o empleado inactivo');
      setPin('');
      return;
    }
    if (match.id === register?.staff_id && shift === register?.shift) {
      toast.info('No hay cambios que registrar');
      setPin('');
      return;
    }
    setSubmitting(true);
    changeMut.mutate(match);
  };

  // Auto-submit cuando el PIN coincide
  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6) {
      const match = staff.find(s => s.pin === pin && s.is_active !== false);
      if (match) tryChange(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const addDigit = (d) => { if (pin.length < 6) setPin(p => p + d); };
  const removeDigit = () => setPin(p => p.slice(0, -1));
  const clearPin = () => setPin('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Cambiar Cajero / Turno
          </DialogTitle>
          <DialogDescription>
            La sesión de caja sigue abierta. El nuevo cajero valida su PIN y
            queda registrado en el historial del cierre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-secondary/50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cajero actual:</span>
              <strong>{register?.staff_name || register?.operator || '—'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turno actual:</span>
              <strong className="capitalize">{register?.shift || '—'}</strong>
            </div>
          </div>

          <div>
            <Label className="text-xs">Nuevo Turno</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manana">Mañana</SelectItem>
                <SelectItem value="tarde">Tarde</SelectItem>
                <SelectItem value="noche">Noche</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">PIN del nuevo cajero</Label>
            <div className="flex justify-center gap-2 my-2">
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? 'bg-primary border-primary' : 'border-border'}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  className="h-11 text-lg font-semibold"
                  onClick={() => addDigit(String(n))}
                  disabled={submitting}
                >
                  {n}
                </Button>
              ))}
              <Button type="button" variant="ghost" className="h-11 text-xs" onClick={clearPin} disabled={submitting}>
                Limpiar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 text-lg font-semibold"
                onClick={() => addDigit('0')}
                disabled={submitting}
              >
                0
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={removeDigit} disabled={submitting}>
                <Delete className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}