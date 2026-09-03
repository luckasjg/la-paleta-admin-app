import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAdjustmentReasons, DEFAULT_REASONS } from '@/lib/useAdjustmentReasons';

const slugify = (text) =>
  text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_ñáéíóúü]/g, '');

export default function AdjustmentReasonManager({ open, onOpenChange }) {
  const { raw } = useAdjustmentReasons();
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['adjustment_reasons'] });

  // La primera vez que se abre el gestor, sembramos los motivos predeterminados.
  const seed = useMutation({
    mutationFn: () => base44.entities.AdjustmentReason.bulkCreate(
      DEFAULT_REASONS.map(r => ({ ...r, is_default: true, is_active: true }))
    ),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const addReason = useMutation({
    mutationFn: async () => {
      const label = newLabel.trim();
      if (!label) throw new Error('Escribe el nombre del motivo');
      const value = slugify(label);
      if (!value) throw new Error('Nombre de motivo inválido');
      if (raw.some(r => r.value === value)) throw new Error('Ese motivo ya existe');
      await base44.entities.AdjustmentReason.create({ value, label, is_default: false, is_active: true });
    },
    onSuccess: () => { setNewLabel(''); invalidate(); toast.success('Motivo agregado'); },
    onError: (e) => toast.error(e.message),
  });

  const renameReason = useMutation({
    mutationFn: async () => {
      const label = editLabel.trim();
      if (!label) throw new Error('El nombre no puede estar vacío');
      await base44.entities.AdjustmentReason.update(editId, { label });
    },
    onSuccess: () => { setEditId(null); invalidate(); toast.success('Motivo actualizado'); },
    onError: (e) => toast.error(e.message),
  });

  const removeReason = useMutation({
    mutationFn: (id) => base44.entities.AdjustmentReason.delete(id),
    onSuccess: () => { invalidate(); toast.success('Motivo eliminado'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Motivos de Ajuste</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {raw.length === 0 ? (
            <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm space-y-3">
              <p className="text-muted-foreground">
                Aún no hay motivos guardados. Carga los 5 motivos predeterminados para empezar a editarlos.
              </p>
              <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="w-full">
                {seed.isPending ? 'Cargando...' : 'Cargar motivos predeterminados'}
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {raw.map(r => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  {editId === r.id ? (
                    <>
                      <Input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="h-10 text-sm"
                        autoFocus
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => renameReason.mutate()} disabled={renameReason.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setEditId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium truncate">{r.label}</span>
                      <Button
                        variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                        onClick={() => { setEditId(r.id); setEditLabel(r.label); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive"
                        onClick={() => removeReason.mutate(r.id)}
                        disabled={removeReason.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {raw.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Nuevo motivo..."
                className="h-10 text-sm"
                onKeyDown={e => { if (e.key === 'Enter') addReason.mutate(); }}
              />
              <Button className="h-10 shrink-0" onClick={() => addReason.mutate()} disabled={addReason.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}