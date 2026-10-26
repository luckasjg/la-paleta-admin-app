import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ReviewApproveDialog from '@/components/expenses/ReviewApproveDialog';
import { toast } from 'sonner';
import moment from 'moment';

export default function SheetSyncCard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [approving, setApproving] = useState(null);
  const { data: last } = useQuery({
    queryKey: ['expense_sync_runs'],
    queryFn: async () => (await base44.entities.ExpenseSyncRun.list('-run_at', 1))[0] || null,
  });
  const sync = useMutation({
    mutationFn: () => base44.functions.invoke('syncExpensesFromSheet', { source: 'manual' }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['expense_sync_runs'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`${data.created_count} gasto(s) cargado(s) · ${data.duplicate_count} duplicado(s) · ${data.review_count} por revisar`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Carga automática desde Google Sheets</p>
              <p className="text-xs text-muted-foreground">
                {last ? `Última revisión: ${moment(last.run_at).format('DD/MM HH:mm')} · diaria a las 10:00 pm` : 'Aún sin revisiones · diaria a las 10:00 pm'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {last?.status === 'error' && <Badge className="bg-red-100 text-red-700">Error: {last.error}</Badge>}
            {last?.status === 'ok' && <>
              <Badge className="bg-green-100 text-green-700">{last.created_count} cargados</Badge>
              <Badge className="bg-secondary text-secondary-foreground">{last.duplicate_count} duplicados</Badge>
              <Button size="sm" variant="ghost" onClick={() => setOpen(!open)} disabled={!last.review_count}>
                <Badge className="bg-amber-100 text-amber-700">{last.review_count} por revisar</Badge>
                {last.review_count > 0 && (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
              </Button>
            </>}
            <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCw className={`h-4 w-4 ${sync.isPending ? 'animate-spin' : ''}`} /> {sync.isPending ? 'Revisando...' : 'Revisar ahora'}
            </Button>
          </div>
        </div>
        {open && last?.review_rows?.length > 0 && (
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y text-xs">
            {last.review_rows.map((r, i) => (
              <div key={i} className="p-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-medium">{r.tab} · fila {r.row}:</span> {r.text}
                  {/vuelto/i.test(`${r.text} ${r.concepto || ''}`) && <Badge className="ml-2 bg-blue-100 text-blue-700">Vuelto</Badge>}
                  <div className="text-amber-700">{r.reason}</div>
                </div>
                {r.approved
                  ? <Badge className="bg-green-100 text-green-700 shrink-0"><Check className="h-3 w-3 mr-1" />Aprobado</Badge>
                  : <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => setApproving(i)}>Aprobar</Button>}
              </div>
            ))}
          </div>
        )}
        {approving !== null && (
          <ReviewApproveDialog run={last} index={approving} onClose={() => setApproving(null)} />
        )}
      </CardContent>
    </Card>
  );
}