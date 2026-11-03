import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function ModulePasswordGate({ module, title, children }) {
  const key = `module_unlocked_${module}`;
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem(key) === '1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['module_lock', module],
    enabled: !unlocked,
    queryFn: async () => (await base44.functions.invoke('moduleLock', { action: 'status', module })).data,
  });

  if (unlocked || data?.enabled === false) return children;
  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await base44.functions.invoke('moduleLock', { action: 'verify', module, password }).catch(() => null);
    setBusy(false);
    if (res?.data?.ok) { sessionStorage.setItem(key, '1'); setUnlocked(true); }
    else setError('Clave incorrecta');
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-sm p-8 space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">Ingresa la clave del módulo para continuar</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="text-center" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!password || busy}>{busy ? 'Verificando...' : 'Entrar'}</Button>
        </form>
      </Card>
    </div>
  );
}