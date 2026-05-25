import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BreakevenAnalysis({
  fixedExpenses,
  marginPct,
  onMarginChange,
  monthlySales,
  monthLabel,
}) {
  const marginRatio = Math.max(0.01, Math.min(0.99, (marginPct || 0) / 100));
  const breakevenRevenue = fixedExpenses / marginRatio;
  const progressPct = breakevenRevenue > 0 ? Math.min(100, (monthlySales / breakevenRevenue) * 100) : 0;
  const reached = monthlySales >= breakevenRevenue && breakevenRevenue > 0;
  const missing = Math.max(0, breakevenRevenue - monthlySales);
  const surplus = Math.max(0, monthlySales - breakevenRevenue);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Punto de Equilibrio — {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Inputs/summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-[10px] text-muted-foreground">Gastos Fijos del Mes</p>
            <p className="text-xl font-bold font-mono">${fixedExpenses.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border p-3">
            <Label className="text-[10px] text-muted-foreground">Margen Contribución (%)</Label>
            <Input
              type="number"
              step="1"
              min="1"
              max="99"
              value={marginPct}
              onChange={e => onMarginChange(parseFloat(e.target.value) || 0)}
              className="h-8 mt-1 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Promedio de tus productos</p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-[10px] text-muted-foreground">Punto de Equilibrio</p>
            <p className="text-xl font-bold font-mono text-primary">${breakevenRevenue.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">ventas requeridas</p>
          </div>

          <div className={`rounded-lg p-3 ${reached ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <p className="text-[10px] text-muted-foreground">Ventas Reales</p>
            <p className={`text-xl font-bold font-mono ${reached ? 'text-emerald-600' : 'text-amber-600'}`}>
              ${monthlySales.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{progressPct.toFixed(1)}% del objetivo</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progreso hacia el punto de equilibrio</span>
            <span className="font-semibold">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-5 rounded-full bg-secondary overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                reached
                  ? 'bg-emerald-500'
                  : progressPct < 50
                  ? 'bg-red-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(2, progressPct)}%` }}
            />
            {reached && (
              <div
                className="absolute top-0 h-full bg-emerald-600/30"
                style={{
                  left: `${(breakevenRevenue / monthlySales) * 100}%`,
                  width: `${100 - (breakevenRevenue / monthlySales) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>$0</span>
            <span>${breakevenRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Status message */}
        {reached ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 text-sm">
                ¡Umbral de rentabilidad alcanzado! Generando utilidad.
              </p>
              <p className="text-xs text-emerald-600">
                Excedente sobre el punto de equilibrio: <span className="font-mono font-bold">+${surplus.toFixed(2)}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-3 rounded-lg border p-3 ${
            progressPct < 50 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <AlertCircle className={`h-5 w-5 flex-shrink-0 ${progressPct < 50 ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className={`font-semibold text-sm ${progressPct < 50 ? 'text-red-700' : 'text-amber-700'}`}>
                Faltan <span className="font-mono">${missing.toFixed(2)}</span> para cubrir los costos fijos
              </p>
              <p className={`text-xs ${progressPct < 50 ? 'text-red-600' : 'text-amber-600'}`}>
                Con un margen del {marginPct}%, necesitas ${breakevenRevenue.toFixed(2)} en ventas mensuales.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground flex items-start gap-2">
          <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Fórmula:</strong> Punto de Equilibrio = Gastos Fijos / Margen de Contribución.
            Ajusta el margen promedio según los datos del módulo de Rentabilidad.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}