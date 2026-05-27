import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollText, Search } from 'lucide-react';
import { formatUSD, formatVES } from '@/lib/useExchangeRate';
import moment from 'moment';

const sourceLabels = {
  cash_register_close: { label: 'Cierre de Caja', cls: 'bg-blue-100 text-blue-700' },
  manual: { label: 'Manual', cls: 'bg-secondary text-secondary-foreground' },
};

export default function ConsolidationHistory() {
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wallet_consolidations'],
    queryFn: () => base44.entities.WalletConsolidation.list('-date', 500),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      (i.wallet_name || '').toLowerCase().includes(q) ||
      (i.destination || '').toLowerCase().includes(q) ||
      (i.closed_by || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalUSD = filtered.reduce((s, i) => s + (Number(i.amount_usd) || 0), 0);
  const totalVES = filtered.reduce((s, i) => s + (Number(i.amount_ves) || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-primary" /> Auditoría de Fondos / Liquidaciones
            </CardTitle>
            <CardDescription className="text-xs">
              Registro histórico de todos los fondos retirados de billeteras (manual o por cierre de caja).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Total liquidado</p>
              <p className="font-mono font-bold">{formatUSD(totalUSD)} · {formatVES(totalVES)}</p>
            </div>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Buscar por billetera, destino o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Billetera</TableHead>
              <TableHead className="text-xs text-right">Monto</TableHead>
              <TableHead className="text-xs text-right">Equiv. USD</TableHead>
              <TableHead className="text-xs">Destino</TableHead>
              <TableHead className="text-xs">Origen</TableHead>
              <TableHead className="text-xs">Cerrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">Sin liquidaciones registradas</TableCell></TableRow>
            ) : (
              filtered.map((i) => {
                const src = sourceLabels[i.source] || sourceLabels.manual;
                const formattedAmount = i.wallet_currency === 'USD'
                  ? formatUSD(i.amount_native || 0)
                  : formatVES(i.amount_native || 0);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">
                      <div>{moment(i.date).format('DD/MM/YY')}</div>
                      <div className="text-[10px] text-muted-foreground">{moment(i.date).format('HH:mm')}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{i.wallet_name}</div>
                      <Badge variant="outline" className="text-[9px] mt-0.5">{i.wallet_currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formattedAmount}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatUSD(i.amount_usd || 0)}</TableCell>
                    <TableCell className="text-xs">{i.destination}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${src.cls}`}>{src.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{i.closed_by || '—'}</TableCell>
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