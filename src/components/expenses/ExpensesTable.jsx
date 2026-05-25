import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Repeat } from 'lucide-react';
import moment from 'moment';

export default function ExpensesTable({ rows, onEdit, onDelete }) {
  if (!rows.length) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No hay gastos registrados para el período seleccionado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={`${r.expense.id}-${r.isProjection ? 'proj' : 'real'}`}>
              <TableCell className="text-sm">{moment(r.displayDate).format('DD/MM/YYYY')}</TableCell>
              <TableCell className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  {r.expense.description}
                  {r.expense.is_recurring && <Repeat className="h-3 w-3 text-primary" />}
                </div>
              </TableCell>
              <TableCell className="text-sm">{r.expense.category || '—'}</TableCell>
              <TableCell>
                <Badge variant={r.expense.type === 'fijo' ? 'default' : 'secondary'} className="text-[10px]">
                  {r.expense.type === 'fijo' ? 'Fijo' : 'Variable'}
                </Badge>
              </TableCell>
              <TableCell>
                {r.isProjection ? (
                  <Badge variant="outline" className="text-[10px]" title={`Origen: ${moment(r.expense.date).format('MMM YYYY')}`}>
                    Recurrente
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {r.expense.is_recurring ? 'Inicio recurrencia' : 'Registro directo'}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                ${(r.expense.amount || 0).toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r.expense)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => onDelete(r.expense)}
                  title={r.isProjection ? 'Eliminar la regla de recurrencia' : 'Eliminar gasto'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}