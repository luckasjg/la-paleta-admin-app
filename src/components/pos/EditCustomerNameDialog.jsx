import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditCustomerNameDialog({ open, onOpenChange, customer, onSaved }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setName(customer?.full_name || ''); }, [open, customer]);

  const save = async () => {
    if (name.trim().length < 2) return toast.error('Escribe el nombre y apellido');
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('updateCustomerName', { customer_id: customer.id, full_name: name });
      onSaved(data.full_name);
      toast.success('Nombre actualizado');
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'No se pudo actualizar el nombre');
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Editar nombre del cliente</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>Nombre y apellido</Label>
          <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
          {customer?.cedula && <p className="text-xs text-muted-foreground">V-{customer.cedula}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}