import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';
import { useRole } from '@/lib/useRole';

/** Cancela (elimina) una devolución pendiente. Sólo admin. */
export default function CancelRefundButton({ refund, onCancel, isCancelling }) {
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!isAdmin || refund.status === 'pagada') return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={isCancelling}
        className="h-11 border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <XCircle className="h-4 w-4 mr-1.5" /> Cancelar devolución
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta devolución?</AlertDialogTitle>
            <AlertDialogDescription>
              La devolución se <strong>eliminará definitivamente</strong> y se avisará en #caja de Slack
              para que el operador de pagos <strong>no envíe el dinero</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Motivo (obligatorio)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. el cliente lo usó como abono, compró otros productos..."
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onCancel(refund, reason.trim());
                setOpen(false);
                setReason('');
              }}
              disabled={isCancelling || !reason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar devolución
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}