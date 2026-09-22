import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Tabla compacta de datos exactos para las vistas ampliadas.
 * `columns` = [{ key, label, align, format }]
 */
export default function DetailTable({ title, columns, rows, emptyText = 'Sin datos en este periodo', footer }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/60 hover:bg-secondary/60">
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  className={`h-9 text-[11px] uppercase tracking-wide ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-xs text-muted-foreground py-6">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, i) => (
              <TableRow key={row.id ?? i}>
                {columns.map(c => (
                  <TableCell
                    key={c.key}
                    className={`py-1.5 text-xs ${c.align === 'right' ? 'text-right font-mono' : ''} ${c.strong ? 'font-semibold' : ''}`}
                  >
                    {c.format ? c.format(row[c.key], row) : row[c.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {footer && (
              <TableRow className="bg-secondary/40 hover:bg-secondary/40 font-semibold">
                {columns.map(c => (
                  <TableCell key={c.key} className={`py-2 text-xs ${c.align === 'right' ? 'text-right font-mono' : ''}`}>
                    {c.format && footer[c.key] !== undefined && c.key !== columns[0].key
                      ? c.format(footer[c.key], footer)
                      : footer[c.key] ?? ''}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const money = (v) => `$${Number(v || 0).toFixed(2)}`;
export const num = (v) => Number(v || 0).toLocaleString('es-VE');
export const pct = (v) => `${Number(v || 0).toFixed(1)}%`;