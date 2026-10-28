import React, { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, IceCream, Instagram, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomerRow({ c, onOpen, onEdit, onDelete, onRedeem }) {
  const [busy, setBusy] = useState(false);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const redeem = async () => { setBusy(true); await onRedeem(c); setBusy(false); };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => onOpen(c)}>
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">{c.full_name?.[0]?.toUpperCase()}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{c.full_name}</p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          {c.phone}
          {c.instagram && <><span>·</span><Instagram className="h-3 w-3" />@{c.instagram}</>}
        </p>
      </div>
      {c.is_registered === false && <span className="text-[10px] uppercase text-muted-foreground">Express</span>}
      {c.event_status === 'pendiente' && (
        <Button size="sm" onClick={stop(redeem)} disabled={busy}><IceCream className="h-4 w-4" /> {busy ? 'Guardando…' : 'Canjear Helado'}</Button>
      )}
      {c.event_status === 'canjeado' && (
        <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" />Canjeado {c.event_redeemed_at && format(new Date(c.event_redeemed_at), 'dd/MM HH:mm')}</span>
      )}
      <Button size="icon" variant="ghost" onClick={stop(() => onEdit(c))}><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={stop(() => onDelete(c))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}