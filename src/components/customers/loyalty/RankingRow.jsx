import React from 'react';
import { Eye, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { reminderMessage } from '@/lib/loyaltyStandings';

const BAR = { available: 'bg-emerald-500', blocked: 'bg-amber-500', progress: 'bg-primary' };

export default function RankingRow({ rank, customer: c, standing: st, onOpen }) {
  const { toast } = useToast();
  const copy = async () => {
    await navigator.clipboard.writeText(reminderMessage(c, st));
    toast({ title: 'Mensaje copiado', description: `Recordatorio para ${c.full_name}` });
  };
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-6 text-center text-xs font-semibold text-muted-foreground">{rank}</span>
      <div className="min-w-0 w-48 shrink-0">
        <p className="text-sm font-medium truncate">{c.full_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{c.cedula ? `C.I. ${c.cedula}` : c.phone}</p>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground truncate">{st.current} → <span className="font-medium text-foreground">{st.next}</span></span>
          <span className="font-mono shrink-0">{Math.floor(st.pct)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${BAR[st.status]}`} style={{ width: `${st.pct}%` }} /></div>
        <p className="text-[11px] text-muted-foreground">{st.label}</p>
      </div>
      <Button size="icon" variant="ghost" title="Ver detalle" onClick={() => onOpen(c)}><Eye className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" title="Copiar recordatorio" onClick={copy}><Copy className="h-4 w-4" /></Button>
    </div>
  );
}