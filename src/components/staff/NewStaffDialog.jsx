import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function NewStaffDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const created = await base44.entities.StaffPOS.create({ full_name: name.trim(), position: position.trim(), is_active: true });
    setSaving(false);
    setName(''); setPosition('');
    onOpenChange(false);
    onCreated(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nuevo colaborador</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Cargo</Label><Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Ej. Heladero, Limpieza" /></div>
          <p className="text-xs text-muted-foreground">Sin PIN: recibe cortesías pero no puede abrir caja. El PIN se asigna en Configuración → Personal POS.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Guardando...' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}