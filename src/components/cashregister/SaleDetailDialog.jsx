import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift } from 'lucide-react';
import moment from 'moment';

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Tarjeta',
  mixto: 'Mixto',
};

export default function SaleDetailDialog({ sale, supplies = [], open, onOpenChange }) {
  if (!sale) return null;
  const items = sale.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalle de Venta — {moment(sale.sale_date).format('DD/MM/YY HH:mm')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary row */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-muted-foreground">Método:
              <span className="ml-1 font-medium text-foreground">{PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</span>
            </span>
            <span className="text-muted-foreground">Total:
              <span className="ml-1 font-bold text-primary">${sale.total?.toFixed(2)}</span>
            </span>
            {sale.cash_amount > 0 && (
              <span className="text-muted-foreground">Efectivo: <span className="ml-1 font-medium text-foreground">${sale.cash_amount?.toFixed(2)}</span></span>
            )}
            {sale.digital_amount > 0 && (
              <span className="text-muted-foreground">Digital: <span className="ml-1 font-medium text-foreground">${sale.digital_amount?.toFixed(2)}</span></span>
            )}
          </div>

          {/* Items table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead>Sabor / Detalle</TableHead>
                <TableHead>Envase Desc.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => {
                const utensil = item.utensil_supply_id
                  ? supplies.find(s => s.id === item.utensil_supply_id)
                  : null;
                return (
                  <TableRow key={idx} className={item.is_courtesy ? 'bg-amber-50' : ''}>
                    <TableCell className="text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        {item.product_name}
                        {item.is_courtesy && <Gift className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title="Cortesía" />}
                      </div>
                      {item.is_courtesy && <span className="text-xs text-amber-600">Cortesía</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.flavor || item.size_label || '—'}
                      {item.grams > 0 && ` · ${item.grams}g`}
                    </TableCell>
                    <TableCell className="text-xs">
                      {utensil ? (
                        <Badge variant="outline" className="text-xs">
                          {utensil.name} ×{item.quantity}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.is_courtesy
                        ? <span className="text-amber-600">$0.00</span>
                        : `$${item.subtotal?.toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}