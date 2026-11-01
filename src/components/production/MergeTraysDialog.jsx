import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/shared/SearchableCombobox';
import { toast } from 'sonner';
import moment from 'moment';

const opt = (t) => ({ value: t.id, label: t.recipe_name, sublabel: `${(t.remaining_grams || 0).toFixed(0)}g${t.in_vitrine ? ' · vitrina' : ''}` });

export default function MergeTraysDialog({ open, onOpenChange, trays }) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const qc = useQueryClient();
  const active = trays.filter(t => t.status === 'activa');
  const source = active.find(t => t.id === sourceId);
  const target = active.find(t => t.id === targetId);

  const merge = useMutation({
    mutationFn: async () => {
      const moved = source.remaining_grams || 0;
      const before = target.remaining_grams || 0;
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.Tray.update(target.id, { remaining_grams: before + moved, status: 'activa' });
      await base44.entities.Tray.update(source.id, { remaining_grams: 0, status: 'agotada', in_vitrine: false, closed_at: new Date().toISOString() });
      await base44.entities.TrayEvent.create({
        type: 'transferencia', date: moment().format('YYYY-MM-DD'),
        tray_id: target.id, recipe_name: target.recipe_name, grams: moved,
        remaining_before: before, remaining_after: before + moved,
        source_tray_id: source.id, source_recipe_name: source.recipe_name,
        operator: me?.full_name || me?.email || '',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['tray_events'] });
      toast.success('Bandejas unidas');
      setSourceId(''); setTargetId(''); onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Unir bandejas</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div><Label>Bandeja origen (se vacía)</Label>
            <SearchableCombobox value={sourceId} onChange={setSourceId} options={active.filter(t => t.id !== targetId).map(opt)} placeholder="Elegir origen" searchPlaceholder="Buscar sabor..." /></div>
          <div><Label>Bandeja destino</Label>
            <SearchableCombobox value={targetId} onChange={setTargetId} options={active.filter(t => t.id !== sourceId).map(opt)} placeholder="Elegir destino" searchPlaceholder="Buscar sabor..." /></div>
          {source && target && (
            <p className="text-xs text-muted-foreground">
              Se pasarán {(source.remaining_grams || 0).toFixed(0)}g de {source.recipe_name} a {target.recipe_name}, que quedará con {((target.remaining_grams || 0) + (source.remaining_grams || 0)).toFixed(0)}g. La origen quedará agotada.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!source || !target || merge.isPending} onClick={() => merge.mutate()}>{merge.isPending ? 'Uniendo...' : 'Unir saldos'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}