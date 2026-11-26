import React, { useState } from 'react';
import moment from 'moment';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { auditAction } from '@/lib/inventoryAudit';
import FindingsList from '@/components/auditor/FindingsList';
import AuditorChat from '@/components/auditor/AuditorChat';
import SupplySearchPanel from '@/components/auditor/SupplySearchPanel';

export default function AuditorDrawer({ open, onOpenChange, audit }) {
  const [tab, setTab] = useState('findings');
  const [sending, setSending] = useState(false);
  const findings = audit.data?.findings || [];

  const sendSummary = async () => {
    setSending(true);
    try {
      const res = await auditAction({ action: 'summary' });
      toast.success(`Resumen enviado a Slack (${res.total} hallazgos)`);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border space-y-3 text-left">
          <div>
            <SheetTitle className="text-lg">Auditor de Inventario</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {audit.data?.generated_at ? `Revisado ${moment(audit.data.generated_at).fromNow()}` : 'Revisando…'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={audit.isFetching} onClick={() => audit.refetch()}>
              <RefreshCw className={`h-4 w-4 ${audit.isFetching ? 'animate-spin' : ''}`} /> Volver a auditar
            </Button>
            <Button size="sm" variant="outline" disabled={sending || audit.data?.slack_configured === false} onClick={sendSummary}
              title={audit.data?.slack_configured === false ? 'Falta configurar el webhook de Slack' : undefined}>
              <Send className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar resumen a Slack'}
            </Button>
          </div>
          <div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-sm">
            {[['findings', `Hallazgos (${findings.length})`], ['search', 'Buscar'], ['chat', 'Consultar']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className={`rounded-md py-1.5 font-medium transition-all ${tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {tab === 'findings' && <FindingsList findings={findings} loading={audit.isLoading} />}
          {tab === 'search' && <SupplySearchPanel findings={findings} />}
          {tab === 'chat' && <AuditorChat />}
        </div>
      </SheetContent>
    </Sheet>
  );
}