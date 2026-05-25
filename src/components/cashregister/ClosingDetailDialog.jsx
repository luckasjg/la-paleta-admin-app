import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import moment from 'moment';

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  efectivo_usd: 'Efectivo USD',
  efectivo_ves: 'Efectivo VES',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  zelle: 'Zelle',
  mixto: 'Mixto',
};

/**
 * Read-only view of a past CashRegister closing with all related sales.
 */
export default function ClosingDetailDialog({ register, sales = [], open, onOpenChange }) {
  if (!register) return null;

  // Excluir ventas anuladas de totales y desglose por método
  const validSales = sales.filter(s => s.status !== 'voided');
  const total = validSales.reduce((s, v) => s + (v.total || 0), 0);
  const byMethod = {};
  validSales.forEach(s => {
    const m = s.payment_method || 'mixto';
    byMethod[m] = (byMethod[m] || 0) + (s.total || 0);
  });

  const shiftLabel = register.shift === 'manana' ? 'Mañana' : register.shift === 'tarde' ? 'Tarde' : 'Noche';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Cierre de Caja — {moment(register.date).format('DD/MM/YYYY')} ({shiftLabel})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Card className="p-4 bg-secondary/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Total Ventas</div>
                <div className="font-bold text-lg">${(register.total_sales || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Transacciones</div>
                <div className="font-semibold">{register.sales_count || sales.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Efectivo Sistema</div>
                <div className="font-semibold">${(register.system_cash || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Digital</div>
                <div className="font-semibold">${(register.system_digital || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Efectivo Declarado</div>
                <div className="font-semibold">${(register.declared_cash || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Diferencia</div>
                <div className={`font-semibold ${(register.difference || 0) < 0 ? 'text-destructive' : (register.difference || 0) > 0 ? 'text-yellow-600' : ''}`}>
                  {(register.difference || 0) > 0 ? '+' : ''}${(register.difference || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cajero</div>
                <div className="font-semibold truncate">{register.operator || register.created_by || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estado</div>
                <Badge>{register.status === 'cerrada' ? 'Cerrado' : 'Abierto'}</Badge>
              </div>
            </div>
            {register.notes && (
              <div className="mt-3 pt-3 border-t text-xs">
                <span className="text-muted-foreground">Observaciones: </span>{register.notes}
              </div>
            )}
          </Card>

          {/* Per method */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Ventas por método</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byMethod).map(([m, amt]) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {PAYMENT_LABELS[m] || m}: ${amt.toFixed(2)}
                </Badge>
              ))}
              {Object.keys(byMethod).length === 0 && (
                <span className="text-xs text-muted-foreground">Sin ventas asociadas a este cierre.</span>
              )}
            </div>
          </div>

          {/* Sales list */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Ventas del cierre ({sales.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Ítems</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">Sin ventas</TableCell></TableRow>
                ) : sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{moment(s.sale_date).format('HH:mm')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(s.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ').slice(0, 60) || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {PAYMENT_LABELS[s.payment_method] || s.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${s.total?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="text-sm text-muted-foreground">Total recalculado de ventas listadas:</span>
            <span className="font-bold text-lg">${total.toFixed(2)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}