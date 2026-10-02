import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import OpeningFundForm from '@/components/pos/OpeningFundForm';

/** Corrige el fondo inicial de la sesión de caja abierta. */
export default function EditOpeningFundDialog({ open, onOpenChange, register }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (fund) => base44.entities.CashRegister.update(register.id, fund),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      toast.success('Fondo inicial actualizado');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message || 'Error al actualizar el fondo'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Editar fondo inicial</DialogTitle></DialogHeader>
        {register && (
          <OpeningFundForm
            key={register.id + String(open)}
            staffName={register.staff_name || register.operator || '—'}
            initialUsd={register.opening_cash_usd}
            initialVes={register.opening_cash_ves}
            submitting={mut.isPending}
            backLabel="Cancelar"
            confirmLabel="Guardar fondo"
            onBack={() => onOpenChange(false)}
            onConfirm={(fund) => mut.mutate(fund)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}