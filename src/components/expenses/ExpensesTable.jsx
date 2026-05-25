import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { CATEGORY_LABEL } from './ExpenseForm';
import moment from 'moment';

export default function ExpensesTable({ expenses, onEdit, onDelete }) {
  if (!expenses.length) {
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
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map(e => (
            <TableRow key={e.id}>
              <TableCell className="text-sm">{moment(e.date).format('DD/MM/YYYY')}</TableCell>
              <TableCell className="text-sm font-medium">{e.description}</TableCell>
              <TableCell className="text-sm">{CATEGORY_LABEL[e.category] || e.category}</TableCell>
              <TableCell>
                <Badge variant={e.type === 'fijo' ? 'default' : 'secondary'} className="text-[10px]">
                  {e.type === 'fijo' ? 'Fijo' : 'Variable'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">${(e.amount || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(e)}>
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