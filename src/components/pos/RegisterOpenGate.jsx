import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Delete, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { setActiveSession, getCurrentShift } from '@/lib/cashSession';
import { getPendingAuditRegisters } from '@/lib/pendingAudits';

/**
 * Pantalla de bloqueo del POS. Se muestra cuando no hay una CashRegister
 * con status='abierta'. Solicita PIN al empleado y crea la sesión.
 *
 * Props:
 *   - onOpened(session): callback cuando la sesión queda abierta
 */
export default function RegisterOpenGate({ onOpened }) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const { data: staff = [] } = useQuery({
    queryKey: ['staff_pos'],
    queryFn: () => base44.entities.StaffPOS.list(),
  });

  const { data: registers = [] } = useQuery({
    queryKey: ['cash_registers'],
    queryFn: () => base44.entities.CashRegister.list('-created_date', 100),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['ice_cream_audits'],
    queryFn: () => base44.entities.IceCreamAudit.list('-created_date', 200),
  });

  const pendingAudits = getPendingAuditRegisters(registers, audits);

  const openSessionMut = useMutation({
    mutationFn: async (staffMember) => {
      const now = new Date();
      const session = await base44.entities.CashRegister.create({
        date: moment(now).format('YYYY-MM-DD'),
        shift: getCurrentShift(),
        status: 'abierta',
        staff_id: staffMember.id,
        staff_name: staffMember.full_name,
        operator: staffMember.full_name,
        opened_at: now.toISOString(),
      });
      return session;
    },
    onSuccess: (session) => {
      setActiveSession({
        id: session.id,
        staff_id: session.staff_id,
        staff_name: session.staff_name,
        shift: session.shift,
        date: session.date,
        opened_at: session.opened_at,
      });
      qc.invalidateQueries({ queryKey: ['active_cash_session'] });
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success(`Sesión abierta — ${session.staff_name}`);
      onOpened?.(session);
    },
    onError: (e) => {
      setSubmitting(false);
      toast.error(e.message || 'Error al abrir sesión');
    },
  });

  const tryOpen = (currentPin) => {
    if (submitting) return;
    if (pendingAudits.length > 0) {
      toast.error('Hay auditorías de helado pendientes del turno anterior');
      setPin('');
      return;
    }
    const match = staff.find(s => s.pin === currentPin && s.is_active !== false);
    if (!match) {
      toast.error('PIN incorrecto o empleado inactivo');
      setPin('');
      return;
    }
    setSubmitting(true);
    openSessionMut.mutate(match);
  };

  // Auto-submit cuando el PIN alcanza una longitud razonable y coincide
  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6) {
      const match = staff.find(s => s.pin === pin && s.is_active !== false);
      if (match) tryOpen(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const addDigit = (d) => {
    if (pin.length >= 6) return;
    setPin(p => p + d);
  };
  const removeDigit = () => setPin(p => p.slice(0, -1));
  const clearPin = () => setPin('');

  const noStaff = staff.length === 0;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-7rem)] p-4">
      <Card className="w-full max-w-sm p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Caja Cerrada</h2>
          <p className="text-sm text-muted-foreground">
            Ingresa tu PIN para abrir la sesión de caja y comenzar a vender.
          </p>
        </div>

        {pendingAudits.length > 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3 space-y-3 text-center">
            <p>
              No puedes abrir una caja nueva: hay <strong>{pendingAudits.length}</strong> sesión(es)
              cerrada(s) pendiente(s) de <strong>auditoría de helados</strong>.
            </p>
            <Button asChild size="sm" className="w-full">
              <Link to="/caja">
                <ClipboardCheck className="h-4 w-4 mr-1.5" /> Ir a realizar la auditoría
              </Link>
            </Button>
          </div>
        ) : noStaff ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3 text-center">
            No hay empleados registrados. Pídele a un administrador que cree
            empleados POS en <strong>Configuración</strong>.
          </div>
        ) : (
          <>
            {/* PIN display */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'bg-primary border-primary' : 'border-border'}`}
                />
              ))}
            </div>

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <Button
                  key={n}
                  variant="outline"
                  className="h-14 text-xl font-semibold"
                  onClick={() => addDigit(String(n))}
                  disabled={submitting}
                >
                  {n}
                </Button>
              ))}
              <Button variant="ghost" className="h-14 text-xs" onClick={clearPin} disabled={submitting}>
                Limpiar
              </Button>
              <Button
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => addDigit('0')}
                disabled={submitting}
              >
                0
              </Button>
              <Button variant="ghost" className="h-14" onClick={removeDigit} disabled={submitting}>
                <Delete className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              Turno actual: <strong className="capitalize">{getCurrentShift()}</strong> ·{' '}
              {moment().format('DD/MM/YYYY HH:mm')}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}