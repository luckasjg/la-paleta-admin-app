import React from 'react';
import moment from 'moment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';

const KIND_STYLES = {
  fondo: 'text-blue-700', venta: 'text-green-700', abono: 'text-green-700',
  vuelto: 'text-destructive', vuelto_digital: 'text-amber-600',
};

const Line = ({ label, value, strong }) => (
  <div className={`flex justify-between ${strong ? 'font-semibold text-sm pt-1 border-t border-border' : ''}`}>
    <span className="font-sans text-muted-foreground">{label}</span><span>{value}</span>
  </div>
);

export default function CashDrawerDetailDialog({ open, onOpenChange, movements, summary }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Movimientos del fondo de caja</DialogTitle></DialogHeader>
        <Card className="p-4 bg-secondary/50 space-y-1 text-xs font-mono">
          <Line label="Fondo inicial" value={`+$${summary.opening.toFixed(2)}`} />
          <Line label="Cobros en efectivo (ventas y abonos)" value={`+$${summary.cashIn.toFixed(2)}`} />
          <Line label="Vueltos en efectivo" value={`−$${summary.cashChange.toFixed(2)}`} />
          <Line label="Vueltos digitales (efectivo que quedó en gaveta)" value={`$${summary.digitalChange.toFixed(2)}`} />
          <Line label="Ventas reales de la sesión" value={`$${summary.sales.toFixed(2)}`} />
          <Line label="Efectivo físico esperado" value={`$${summary.expected.toFixed(2)}`} strong />
        </Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead><TableHead>Concepto</TableHead>
              <TableHead>Método</TableHead><TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sin movimientos</TableCell></TableRow>
            ) : movements.map(m => (
              <TableRow key={m.key}>
                <TableCell className="text-sm">{m.date ? moment(m.date).format('HH:mm') : '—'}</TableCell>
                <TableCell className="text-sm">{m.concept}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.method}</TableCell>
                <TableCell className={`text-right font-mono font-semibold ${KIND_STYLES[m.kind]}`}>
                  {m.kind === 'vuelto_digital' ? `($${m.usd.toFixed(2)})` : `${m.drawer < 0 ? '−' : '+'}$${Math.abs(m.drawer).toFixed(2)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}