import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function IceCreamAudit({ activeTrays = [], todaySales = [], shift = 'manana' }) {
  const qc = useQueryClient();
  const today = moment().format('YYYY-MM-DD');

  // Build theoretical consumption per tray from today's sales
  const theoreticalMap = useMemo(() => {
    const map = {}; // tray_id -> grams consumed
    for (const sale of todaySales) {
      for (const item of (sale.items || [])) {
        if (item.tray_id && item.grams) {
          map[item.tray_id] = (map[item.tray_id] || 0) + (item.grams * (item.quantity || 1));
        }
      }
    }
    return map;
  }, [todaySales]);

  // Physical weight inputs keyed by tray_id
  const [physicalWeights, setPhysicalWeights] = useState({});

  const setWeight = (trayId, value) => {
    setPhysicalWeights(prev => ({ ...prev, [trayId]: value }));
  };

  // Derived audit rows
  const rows = useMemo(() => {
    return activeTrays.map(tray => {
      const gramsConsumed = theoreticalMap[tray.id] || 0;
      const theoreticalStock = Math.max(0, (tray.remaining_grams || 0) - gramsConsumed);
      const physicalRaw = physicalWeights[tray.id];
      const physicalWeight = physicalRaw !== undefined && physicalRaw !== '' ? parseFloat(physicalRaw) : null;
      const variance = physicalWeight !== null ? physicalWeight - theoreticalStock : null;
      return { tray, gramsConsumed, theoreticalStock, physicalWeight, variance };
    });
  }, [activeTrays, theoreticalMap, physicalWeights]);

  const totalVariance = rows.reduce((s, r) => s + (r.variance || 0), 0);
  const allFilled = rows.length > 0 && rows.every(r => r.physicalWeight !== null && !isNaN(r.physicalWeight));

  const saveAudit = useMutation({
    mutationFn: async () => {
      // Save audit record
      await base44.entities.IceCreamAudit.create({
        audit_date: today,
        shift,
        entries: rows.map(r => ({
          tray_id: r.tray.id,
          recipe_name: r.tray.recipe_name,
          initial_grams: r.tray.remaining_grams,
          grams_sold_theoretical: r.gramsConsumed,
          theoretical_stock: r.theoreticalStock,
          physical_weight: r.physicalWeight,
          variance: r.variance,
        })),
        total_variance_grams: totalVariance,
      });

      // Update each tray's remaining_grams with the physical count
      for (const r of rows) {
        if (r.physicalWeight !== null && !isNaN(r.physicalWeight)) {
          await base44.entities.Tray.update(r.tray.id, {
            remaining_grams: r.physicalWeight,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      toast.success('Auditoría registrada y bandejas actualizadas');
    },
    onError: (err) => toast.error(err.message),
  });

  if (activeTrays.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Auditoría de Inventario de Helado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No hay bandejas activas para auditar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Auditoría de Inventario de Helado
          </CardTitle>
          <div className="flex items-center gap-3">
            {allFilled && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${totalVariance < -50 ? 'text-red-600' : totalVariance < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {totalVariance < -50 ? <TrendingDown className="h-4 w-4" /> : totalVariance < 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                Merma total: {totalVariance.toFixed(0)}g
              </div>
            )}
            <Button
              size="sm"
              disabled={!allFilled || saveAudit.isPending}
              onClick={() => saveAudit.mutate()}
            >
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              {saveAudit.isPending ? 'Guardando...' : 'Registrar Auditoría'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sabor / Bandeja</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Consumo Teórico</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Stock Teórico</TableHead>
                <TableHead className="text-right">Peso Físico Real (g)</TableHead>
                <TableHead className="text-right">Descuadre / Merma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ tray, gramsConsumed, theoreticalStock, physicalWeight, variance }) => {
                const hasMerma = variance !== null && variance < -50;
                const isOk = variance !== null && variance >= -50;
                return (
                  <TableRow key={tray.id} className={hasMerma ? 'bg-red-50/60' : ''}>
                    <TableCell>
                      <div className="font-medium text-sm">{tray.recipe_name}</div>
                      <div className="text-xs text-muted-foreground">Prod: {tray.production_date ? moment(tray.production_date).format('DD/MM/YY') : '—'}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{(tray.remaining_grams || 0).toFixed(0)}g</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">−{gramsConsumed.toFixed(0)}g</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm">{theoreticalStock.toFixed(0)}g</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={physicalWeights[tray.id] ?? ''}
                        onChange={e => setWeight(tray.id, e.target.value)}
                        className="w-24 text-right ml-auto h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {variance === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : hasMerma ? (
                        <Badge className="bg-red-100 text-red-700 font-mono">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {variance.toFixed(0)}g
                        </Badge>
                      ) : isOk ? (
                        <Badge className="bg-green-100 text-green-700 font-mono">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {variance > 0 ? '+' : ''}{variance.toFixed(0)}g
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Ingresa el peso físico de cada bandeja. El botón "Registrar Auditoría" guardará el reporte y actualizará el stock de las bandejas con el peso real.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}