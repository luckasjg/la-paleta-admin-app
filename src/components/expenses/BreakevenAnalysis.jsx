import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';

export default function BreakevenAnalysis({
  fixedExpenses,
  marginPct,
  marginInfo,
  monthlySales,
  monthLabel,
}) {
  const marginRatio = Math.max(0.01, Math.min(0.99, (marginPct || 0) / 100));
  const breakevenRevenue = fixedExpenses > 0 ? fixedExpenses / marginRatio : 0;
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
        {/* Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3">
            <p className="text-[10px] text-muted-foreground">Gastos Fijos del Mes</p>
            <p className="text-xl font-bold font-mono">${fixedExpenses.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              incluye recurrentes activos
            </p>
          </div>

          <div className={`rounded-lg p-3 border ${marginInfo?.usingFallback ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center gap-1.5">
              {marginInfo?.usingFallback ? (
                <Info className="h-3 w-3 text-amber-600" />
              ) : (
                <Sparkles className="h-3 w-3 text-emerald-600" />
              )}
              <p className="text-[10px] text-muted-foreground">
                {marginInfo?.usingFallback ? 'Margen de Respaldo' : 'Margen Promedio Real'}
              </p>
            </div>
            <p className={`text-xl font-bold font-mono ${marginInfo?.usingFallback ? 'text-amber-700' : 'text-emerald-700'}`}>
              {marginPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {marginInfo?.usingFallback
                ? 'Faltan recetas/productos'
                : `${marginInfo?.sampleCount || 0} combinaciones`}
            </p>
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
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {progressPct.toFixed(1)}% del objetivo
            </p>
          </div>
        </div>

        {/* Margin source warning */}
        {marginInfo?.usingFallback && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Se está usando un <strong>margen de respaldo del 50%</strong> porque aún no hay suficientes recetas/productos activos.
              Añade recetas de helado, asigna precios y costos en Inventario para calcular el margen real automáticamente.
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progreso hacia el punto de equilibrio</span>
            <span className="font-semibold">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-5 rounded-full bg-secondary overflow-hidden">
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
                Con un margen del {marginPct.toFixed(1)}%, necesitas ${breakevenRevenue.toFixed(2)} en ventas mensuales.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <strong>Fórmula:</strong> Punto de Equilibrio = Gastos Fijos / Margen de Contribución Promedio.
          El margen se calcula en tiempo real desde Recetas, Productos e Inventario (misma lógica que la Matriz de Rentabilidad).
        </div>
      </CardContent>
    </Card>
  );
}