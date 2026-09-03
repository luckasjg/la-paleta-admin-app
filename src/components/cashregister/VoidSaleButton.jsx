import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useRole } from '@/lib/useRole';
import { voidSale } from '@/lib/voidSale';

/**
 * Botón de Anular Venta — visible SOLO para ADMIN.
 * Pide confirmación + motivo, revierte inventario y marca status='voided'.
 */
export default function VoidSaleButton({ sale, size = 'sm', variant = 'destructive', className = '' }) {
  const { isAdmin, user } = useRole();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => voidSale({ sale, reason, operatorEmail: user?.email || '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['supplies'] });
      qc.invalidateQueries({ queryKey: ['refund_requests'] });
      toast.success('Venta anulada e inventario repuesto');
      setOpen(false);
      setReason('');
    },
    onError: (err) => toast.error(err.message || 'Error al anular la venta'),
  });

  if (!isAdmin) return null;
  if (sale?.status === 'voided') return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Anular venta"
      >
        <Ban className="h-3.5 w-3.5 mr-1" /> Anular
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>repondrá el inventario</strong>: gramos a las bandejas, insumos de
              recetas y utensilios vinculados. La venta quedará marcada como <strong>Anulada</strong>{' '}
              y se excluirá del cierre de caja y reportes. El registro se conserva como respaldo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. cliente cambió de opinión, error de cobro..."
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); mut.mutate(); }}
              disabled={mut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {mut.isPending ? 'Anulando...' : 'Sí, anular venta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}