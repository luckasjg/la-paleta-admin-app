import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, AlertTriangle, CheckCircle2, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

// Cost per gram of a recipe = (sum of ingredient_qty * supply.cost_per_unit) / yield_amount
const computeRecipeCostPerGram = (recipe, supplies) => {
  if (!recipe || !recipe.yield_amount) return 0;
  const totalCost = (recipe.ingredients || []).reduce((sum, ing) => {
    const supply = supplies.find(s => s.id === ing.supply_id);
    return sum + (supply?.cost_per_unit || 0) * (ing.quantity || 0);
  }, 0);
  return totalCost / recipe.yield_amount;
};

export default function IceCreamAudit({ activeTrays = [], todaySales = [], shift = 'manana', recipes = [], supplies = [], cashRegisterId = null, auditDate = null, sessionLabel = null }) {
  const qc = useQueryClient();
  const today = auditDate || moment().format('YYYY-MM-DD');

  // Build theoretical consumption per tray from today's sales (excluding voided).
  // For multi-flavor sales we use item.flavors[] when available; otherwise fallback to tray_id/grams.
  const theoreticalMap = useMemo(() => {
    const map = {}; // tray_id -> grams consumed
    for (const sale of todaySales) {
      if (sale.status === 'voided') continue;
      for (const item of (sale.items || [])) {
        const qty = item.quantity || 1;
        const flavors = (item.flavors && item.flavors.length > 0)
          ? item.flavors
          : (item.tray_id ? [{ tray_id: item.tray_id, grams: item.grams || 0 }] : []);
        for (const fl of flavors) {
          if (!fl.tray_id) continue;
          map[fl.tray_id] = (map[fl.tray_id] || 0) + ((fl.grams || 0) * qty);
        }
      }
    }
    return map;
  }, [todaySales]);

  // Sólo se auditan las bandejas que están en vitrina (las que realmente se venden)
  const vitrineTrays = useMemo(
    () => activeTrays.filter(t => t.in_vitrine === true),
    [activeTrays]
  );

  // Physical weight inputs keyed by tray_id
  const [physicalWeights, setPhysicalWeights] = useState({});

  const setWeight = (trayId, value) => {
    setPhysicalWeights(prev => ({ ...prev, [trayId]: value }));
  };

  // Derived audit rows
  // IMPORTANT: tray.remaining_grams is ALREADY the live theoretical stock — every sale
  // deducts grams from it at checkout time. So the theoretical stock IS the current
  // remaining_grams of the tray; we must NOT subtract gramsConsumed a second time.
  // gramsConsumed is kept only as an informational column ("Consumo Teórico del turno").
  const rows = useMemo(() => {
    return vitrineTrays.map(tray => {
      const gramsConsumed = theoreticalMap[tray.id] || 0;
      const theoreticalStock = tray.remaining_grams || 0;
      const physicalRaw = physicalWeights[tray.id];
      const physicalWeight = physicalRaw !== undefined && physicalRaw !== '' ? parseFloat(physicalRaw) : null;
      const variance = physicalWeight !== null ? physicalWeight - theoreticalStock : null;
      const recipe = recipes.find(r => r.id === tray.recipe_id) || recipes.find(r => r.name === tray.recipe_name);
      const costPerGram = computeRecipeCostPerGram(recipe, supplies);
      const financialImpact = variance !== null ? variance * costPerGram : null;
      return { tray, gramsConsumed, theoreticalStock, physicalWeight, variance, costPerGram, financialImpact };
    });
  }, [vitrineTrays, theoreticalMap, physicalWeights, recipes, supplies]);

  const totalVariance = rows.reduce((s, r) => s + (r.variance || 0), 0);
  const totalFinancialImpact = rows.reduce((s, r) => s + (r.financialImpact || 0), 0);
  const allFilled = rows.length > 0 && rows.every(r => r.physicalWeight !== null && !isNaN(r.physicalWeight));

  const saveAudit = useMutation({
    mutationFn: async () => {
      // Save audit record
      await base44.entities.IceCreamAudit.create({
        audit_date: today,
        shift,
        cash_register_id: cashRegisterId || undefined,
        entries: rows.map(r => ({
          tray_id: r.tray.id,
          recipe_name: r.tray.recipe_name,
          initial_grams: r.tray.remaining_grams,
          grams_sold_theoretical: r.gramsConsumed,
          theoretical_stock: r.theoreticalStock,
          physical_weight: r.physicalWeight,
          variance: r.variance,
          cost_per_gram: r.costPerGram,
          financial_impact: r.financialImpact,
        })),
        total_variance_grams: totalVariance,
        financial_impact: totalFinancialImpact,
      });

      // Update each tray's remaining_grams with the physical count.
      // Si el peso real es 0 (o menos), la bandeja se cierra automáticamente.
      let closed = 0;
      for (const r of rows) {
        if (r.physicalWeight !== null && !isNaN(r.physicalWeight)) {
          const isEmpty = r.physicalWeight <= 0;
          if (isEmpty) closed++;
          await base44.entities.Tray.update(r.tray.id, {
            remaining_grams: Math.max(0, r.physicalWeight),
            ...(isEmpty ? { status: 'agotada', closed_at: new Date().toISOString() } : {}),
          });
        }
      }
      return { closed };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['trays'] });
      qc.invalidateQueries({ queryKey: ['ice_cream_audits'] });
      toast.success(
        res?.closed > 0
          ? `Auditoría registrada. ${res.closed} bandeja(s) marcada(s) como agotada(s).`
          : 'Auditoría registrada y bandejas actualizadas'
      );
    },
    onError: (err) => toast.error(err.message),
  });

  if (vitrineTrays.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Auditoría de Inventario de Helado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No hay bandejas en vitrina para auditar.</p>
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
            {sessionLabel && (
              <span className="text-xs font-normal text-amber-700">· Sesión pendiente: {sessionLabel}</span>
            )}
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
                <TableHead className="text-right">Consumo del turno</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Stock Teórico</TableHead>
                <TableHead className="text-right">Peso Físico Real (g)</TableHead>
                <TableHead className="text-right">Descuadre / Merma</TableHead>
                <TableHead className="text-right">Impacto ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ tray, gramsConsumed, theoreticalStock, physicalWeight, variance, costPerGram, financialImpact }) => {
                const hasMerma = variance !== null && variance < -50;
                const isOk = variance !== null && variance >= -50;
                return (
                  <TableRow key={tray.id} className={hasMerma ? 'bg-red-50/60' : ''}>
                    <TableCell>
                      <div className="font-medium text-sm">{tray.recipe_name}</div>
                      <div className="text-xs text-muted-foreground">Prod: {tray.production_date ? moment(tray.production_date).format('DD/MM/YY') : '—'}</div>
                    </TableCell>
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
                    <TableCell className="text-right font-mono text-sm">
                      {financialImpact === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : financialImpact < 0 ? (
                        <span className="text-red-600 font-semibold">-${Math.abs(financialImpact).toFixed(2)}</span>
                      ) : financialImpact > 0 ? (
                        <span className="text-green-600 font-semibold">+${financialImpact.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                      {costPerGram > 0 && (
                        <div className="text-[10px] text-muted-foreground">${costPerGram.toFixed(4)}/g</div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {allFilled && (
          <div className="px-4 py-3 border-t bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" /> Pérdida / Ganancia Total de la Auditoría
            </span>
            <span className={`text-base font-bold font-mono ${totalFinancialImpact < 0 ? 'text-red-600' : totalFinancialImpact > 0 ? 'text-green-600' : 'text-foreground'}`}>
              {totalFinancialImpact < 0 ? '-' : totalFinancialImpact > 0 ? '+' : ''}${Math.abs(totalFinancialImpact).toFixed(2)}
            </span>
          </div>
        )}
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Ingresa el peso físico de cada bandeja. El botón "Registrar Auditoría" guardará el reporte y actualizará el stock de las bandejas con el peso real.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}