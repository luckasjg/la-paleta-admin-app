import React from 'react';
import { format } from 'date-fns';
import { Ticket, Pencil, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function Confirm({ title, text, onConfirm, children }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{text}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const d = (v, f = 'dd/MM/yyyy') => format(new Date(v), f);

export default function CouponItem({ coupon: c, onRedeem, onEdit, onDelete, onVoid }) {
  const voided = c.status === 'anulado';
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${voided ? 'opacity-60' : ''}`}>
      <Ticket className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${voided ? 'line-through' : ''}`}>{c.title}</p>
        <p className="text-sm">{c.benefit || <span className="text-muted-foreground italic">Beneficio sin especificar</span>}</p>
        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          Asignado {d(c.created_date)}
          {c.expires_at && ` · Vence ${d(c.expires_at + 'T12:00:00')}`}
          {c.redeemed_at && ` · Canjeado ${d(c.redeemed_at, 'dd/MM/yyyy HH:mm')}`}
          {c.voided_at && ` · Anulado ${d(c.voided_at, 'dd/MM/yyyy HH:mm')}${c.voided_by ? ` por ${c.voided_by}` : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {c.status === 'activo' && <>
          <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Confirm title="Eliminar cupón" text="Se borrará este cupón asignado por error." onConfirm={onDelete}>
            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
          </Confirm>
          <Button size="sm" onClick={onRedeem}>Canjear</Button>
        </>}
        {c.status === 'canjeado' && <>
          <Badge variant="secondary">Canjeado</Badge>
          <Confirm title="Anular canje" text="El cupón quedará anulado, conservando su historial." onConfirm={onVoid}>
            <Button size="icon" variant="ghost"><Ban className="h-4 w-4" /></Button>
          </Confirm>
        </>}
        {voided && <Badge variant="destructive">Anulado</Badge>}
      </div>
    </div>
  );
}