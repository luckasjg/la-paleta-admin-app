import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function RecipesPasswordCard() {
  const qc = useQueryClient();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ['module_lock', 'recetas'],
    queryFn: async () => (await base44.functions.invoke('moduleLock', { action: 'status', module: 'recetas' })).data,
  });

  const save = async (password) => {
    setBusy(true);
    const res = await base44.functions.invoke('moduleLock', { action: 'set', module: 'recetas', password })
      .catch((e) => ({ error: e?.response?.data?.error || 'Error al guardar' }));
    setBusy(false);
    if (res.error) return toast.error(res.error);
    sessionStorage.removeItem('module_unlocked_recetas');
    setPwd(''); setConfirm('');
    qc.invalidateQueries({ queryKey: ['module_lock', 'recetas'] });
    toast.success(password ? 'Clave de Recetas actualizada' : 'Clave de Recetas eliminada');
  };

  const valid = pwd.length >= 4 && pwd === confirm;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Clave del módulo de Recetas</h3>
        <Badge variant={data?.enabled ? 'default' : 'secondary'} className="ml-auto">{data?.enabled ? 'Activa' : 'Sin clave'}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Clave compartida que se pide al entrar a Recetas, además del permiso por rol.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Nueva clave (mín. 4)" />
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar clave" />
      </div>
      {confirm && pwd !== confirm && <p className="text-xs text-destructive">Las claves no coinciden</p>}
      <div className="flex gap-2">
        <Button disabled={!valid || busy} onClick={() => save(pwd)}>Guardar clave</Button>
        {data?.enabled && <Button variant="outline" disabled={busy} onClick={() => save('')}>Quitar clave</Button>}
      </div>
    </Card>
  );
}