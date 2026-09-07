import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Check, Loader2, ShieldAlert, X, Sparkles } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { ALLOWED_PROPOSAL_ENTITIES } from '@/lib/asesorProposals';

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function ProposalCard({ proposal }) {
  const { toast } = useToast();
  const [state, setState] = useState('idle'); // idle | applying | applied | discarded
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCreate = proposal.action === 'create';
  const allowed = ALLOWED_PROPOSAL_ENTITIES.includes(proposal.entity);

  const apply = async () => {
    setConfirmOpen(false);
    setState('applying');
    try {
      if (isCreate) {
        await base44.entities[proposal.entity].create(proposal.data || {});
      } else {
        await base44.entities[proposal.entity].update(proposal.id, {
          [proposal.field]: proposal.new_value
        });
      }
      setState('applied');
      toast({ title: 'Cambio aplicado', description: 'La propuesta se ejecutó correctamente.' });
    } catch (err) {
      setState('idle');
      toast({
        variant: 'destructive',
        title: 'No se pudo aplicar',
        description: err?.message || 'Revisa tus permisos e intenta de nuevo.'
      });
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-accent bg-accent/25">
      <div className="flex items-center gap-2 border-b border-accent/60 px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {isCreate ? 'Propuesta: crear registro' : 'Propuesta de cambio'}
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px]">{proposal.entity}</Badge>
      </div>

      <div className="space-y-3 px-4 py-3">
        {proposal.record_name &&
        <p className="text-sm font-medium text-foreground">{proposal.record_name}</p>
        }

        {isCreate ?
        <div className="space-y-1 rounded-lg bg-background/70 p-3">
            {Object.entries(proposal.data || {}).map(([k, v]) =>
          <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold text-foreground">{fmt(v)}</span>
              </div>
          )}
          </div> :

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-background/70 p-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {proposal.field_label || proposal.field}
              </p>
              <p className="text-sm text-muted-foreground line-through">{fmt(proposal.current_value)}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
            <p className="text-lg font-bold text-foreground">{fmt(proposal.new_value)}</p>
          </div>
        }

        {proposal.impact &&
        <p className="text-xs leading-relaxed text-muted-foreground">{proposal.impact}</p>
        }

        {!allowed ?
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Este tipo de cambio no puede aplicarse desde el asesor. Hazlo desde su departamento correspondiente.</span>
          </div> :
        state === 'applied' ?
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Cambio aplicado
          </div> :
        state === 'discarded' ?
        <p className="text-xs text-muted-foreground">Propuesta descartada.</p> :

        <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={state === 'applying'}>
              {state === 'applying' ?
            <><Loader2 className="h-4 w-4 animate-spin" /> Aplicando…</> :
            <><Check className="h-4 w-4" /> Aplicar</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setState('discarded')} disabled={state === 'applying'}>
              <X className="h-4 w-4" /> Descartar
            </Button>
          </div>
        }
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar este cambio?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCreate ?
              `Se creará un nuevo registro en ${proposal.entity}.` :
              `Se cambiará ${proposal.field_label || proposal.field} de "${fmt(proposal.current_value)}" a "${fmt(proposal.new_value)}"${proposal.record_name ? ` en ${proposal.record_name}` : ''}. Esta acción modifica datos reales de tu sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>Sí, aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}