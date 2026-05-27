import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, ArrowLeftRight, Search, Warehouse as WarehouseIcon, FlaskConical } from 'lucide-react';
import moment from 'moment';
import { LOCATION_LABEL } from '@/lib/stockHelpers';

const DIRECTION_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'wh_to_pr', label: 'Almacén → Producción' },
  { value: 'pr_to_wh', label: 'Producción → Almacén' },
];

const directionOf = (t) => {
  if (t.from_location === 'warehouse' && t.to_location === 'production') return 'wh_to_pr';
  if (t.from_location === 'production' && t.to_location === 'warehouse') return 'pr_to_wh';
  return 'other';
};

const DirectionBadge = ({ transfer }) => {
  const dir = directionOf(transfer);
  const FromIcon = transfer.from_location === 'warehouse' ? WarehouseIcon : FlaskConical;
  const ToIcon = transfer.to_location === 'warehouse' ? WarehouseIcon : FlaskConical;
  const tone =
    dir === 'wh_to_pr'
      ? 'bg-primary/10 text-primary'
      : dir === 'pr_to_wh'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-secondary text-secondary-foreground';

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Badge variant="secondary" className="gap-1 font-normal">
        <FromIcon className="h-3 w-3" />
        {LOCATION_LABEL[transfer.from_location] || transfer.from_location}
      </Badge>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <Badge className={`${tone} hover:${tone} gap-1 font-normal`}>
        <ToIcon className="h-3 w-3" />
        {LOCATION_LABEL[transfer.to_location] || transfer.to_location}
      </Badge>
    </div>
  );
};

export default function TransferHistory({ transfers = [] }) {
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      if (direction !== 'all' && directionOf(t) !== direction) return false;
      if (!q) return true;
      return (
        (t.supply_name || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      );
    });
  }, [transfers, search, direction]);

  const counts = useMemo(() => {
    const c = { wh_to_pr: 0, pr_to_wh: 0 };
    transfers.forEach((t) => {
      const d = directionOf(t);
      if (c[d] !== undefined) c[d] += 1;
    });
    return c;
  }, [transfers]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Historial de Transferencias</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 font-normal">
                Almacén → Producción
              </Badge>
              <span className="font-mono">{counts.wh_to_pr}</span>
            </span>
            <span className="flex items-center gap-1">
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-normal">
                Producción → Almacén
              </Badge>
              <span className="font-mono">{counts.pr_to_wh}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar insumo o nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Tabs value={direction} onValueChange={setDirection}>
            <TabsList>
              {DIRECTION_FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Tipo de Ajuste</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {transfers.length === 0
                      ? 'No hay transferencias registradas'
                      : 'No hay transferencias que coincidan con el filtro'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const date = moment(t.transfer_date || t.created_date);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="font-medium">{date.format('DD/MM/YY')}</div>
                      <div className="text-xs text-muted-foreground">{date.format('HH:mm')}</div>
                    </TableCell>
                    <TableCell className="font-medium">{t.supply_name}</TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">
                      {t.quantity} {t.unit}
                    </TableCell>
                    <TableCell>
                      <DirectionBadge transfer={t} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[16rem] truncate" title={t.notes || ''}>
                      {t.notes || '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}