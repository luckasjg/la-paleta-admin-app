import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const methodLabel = (m) => (m === 'transferencia' ? 'Transferencia' : 'Pago Móvil');

const fmt = (r) => (r.currency === 'VES'
  ? `Bs. ${(r.amount_native || 0).toFixed(2)}`
  : `$${(r.amount_native || 0).toFixed(2)}`);

/** Devoluciones por pago móvil/transferencia del turno, para conciliación. */
export default function RefundsSessionCard({ refunds = [] }) {
  if (refunds.length === 0) return null;

  const totalUSD = refunds.reduce((s, r) => s + (r.amount_usd_equivalent || 0), 0);
  const pendientes = refunds.filter(r => r.status !== 'pagada').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex flex-wrap items-center gap-2">
          Devoluciones por Pago Móvil / Transferencia
          <span className="text-muted-foreground font-normal">
            · total ${totalUSD.toFixed(2)}
          </span>
          {pendientes > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700">{pendientes} pendiente(s)</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vía</TableHead>
              <TableHead>Sale de</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{moment(r.created_date).format('HH:mm')}</TableCell>
                <TableCell className="text-sm">
                  {r.customer_data?.titular || '—'}
                  <span className="block text-xs text-muted-foreground">{r.customer_data?.banco || ''}</span>
                </TableCell>
                <TableCell className="text-sm">{methodLabel(r.method)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.wallet_name || '—'}</TableCell>
                <TableCell className="text-right font-mono">
                  {fmt(r)}
                  <span className="block text-xs text-muted-foreground">≈ ${(r.amount_usd_equivalent || 0).toFixed(2)}</span>
                </TableCell>
                <TableCell className="text-center">
                  {r.status === 'pagada' ? (
                    <Badge className="bg-green-100 text-green-700">Pagada</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}