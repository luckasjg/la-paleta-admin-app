import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import moment from 'moment';

const shiftLabel = (s) => s === 'manana' ? 'Mañana' : s === 'tarde' ? 'Tarde' : s === 'noche' ? 'Noche' : '—';

export default function AuditDetailDialog({ audit, open, onOpenChange }) {
  if (!audit) return null;
  const entries = audit.entries || [];
  const total = audit.total_variance_grams || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Auditoría — {moment(audit.audit_date).format('DD/MM/YYYY')} ({shiftLabel(audit.shift)})
          </DialogTitle>
        </DialogHeader>

        <Card className="p-4 bg-secondary/50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">Operario:</span> <span className="font-semibold">{audit.created_by || '—'}</span></div>
            <div><span className="text-muted-foreground">Bandejas:</span> <span className="font-semibold">{entries.length}</span></div>
            <div>
              <span className="text-muted-foreground">Varianza total:</span>{' '}
              <Badge className={total < -50 ? 'bg-red-100 text-red-700' : total < 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                {total > 0 ? '+' : ''}{total.toFixed(0)}g
              </Badge>
            </div>
          </div>
        </Card>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sabor</TableHead>
              <TableHead className="text-right">Inicial</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">Teórico</TableHead>
              <TableHead className="text-right">Físico</TableHead>
              <TableHead className="text-right">Varianza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, idx) => {
              const v = e.variance || 0;
              const isBad = v < -50;
              return (
                <TableRow key={idx} className={isBad ? 'bg-red-50/60' : ''}>
                  <TableCell className="font-medium text-sm">{e.recipe_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{(e.initial_grams || 0).toFixed(0)}g</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">−{(e.grams_sold_theoretical || 0).toFixed(0)}g</TableCell>
                  <TableCell className="text-right font-mono text-sm">{(e.theoretical_stock || 0).toFixed(0)}g</TableCell>
                  <TableCell className="text-right font-mono text-sm">{(e.physical_weight || 0).toFixed(0)}g</TableCell>
                  <TableCell className="text-right">
                    <Badge className={isBad ? 'bg-red-100 text-red-700 font-mono' : 'bg-green-100 text-green-700 font-mono'}>
                      {isBad ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {v > 0 ? '+' : ''}{v.toFixed(0)}g
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {audit.notes && (
          <div className="text-sm border-t pt-3">
            <span className="text-muted-foreground">Observaciones:</span> {audit.notes}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}