import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CustomerIdentifyGate from '@/components/pos/CustomerIdentifyGate';

/** Asignar o cambiar el cliente sin tocar el carrito. */
export default function CustomerPickerDialog({ open, onOpenChange, sessionId, onDone }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 border-0 bg-transparent shadow-none">
        {open && (
          <CustomerIdentifyGate bare sessionId={sessionId}
            onDone={(c) => { onDone(c); onOpenChange(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}