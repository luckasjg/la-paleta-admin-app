import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Repeat, Loader2 } from 'lucide-react';

export default function DeleteRecurringButton() {
  const qc = useQueryClient();
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    setCount(await base44.entities.Expense.count({ is_recurring: true }));
    setBusy(false);
  };

  const confirm = async () => {
    setBusy(true);
    await base44.entities.Expense.deleteMany({ is_recurring: true });
    await qc.invalidateQueries({ queryKey: ['expenses'] });
    setBusy(false);
    setCount(null);
  };

  return (
    <>
      <Button variant="outline" onClick={open} disabled={busy} className="text-destructive">
        {busy && count === null ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Repeat className="h-4 w-4 mr-2" />}
        Eliminar recurrentes
      </Button>
      <AlertDialog open={count !== null} onOpenChange={(o) => !o && !busy && setCount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar gastos recurrentes</AlertDialogTitle>
            <AlertDialogDescription>
              {count === 0
                ? 'No hay gastos recurrentes registrados.'
                : `Se eliminarán ${count} gasto(s) marcados como recurrentes, junto con sus proyecciones mensuales. Los gastos importados desde Excel y los registros directos no se tocan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            {count > 0 && (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm(); }} disabled={busy} className="bg-destructive hover:bg-destructive/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Eliminar ${count}`}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}