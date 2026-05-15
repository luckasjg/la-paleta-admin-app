import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target } from 'lucide-react';

const LS_KEY = 'dashboard_fixed_costs';

export default function BreakEvenPanel({ grossProfit }) {
  const [fixedCosts, setFixedCosts] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? parseFloat(saved) : 0;
  });

  const handleChange = (val) => {
    const num = parseFloat(val) || 0;
    setFixedCosts(num);
    localStorage.setItem(LS_KEY, String(num));
  };

  const netProfit = grossProfit - fixedCosts;
  const breakEvenPct = fixedCosts > 0 ? Math.min(100, (grossProfit / fixedCosts) * 100) : 100;
  const reached = netProfit >= 0;

  const daysInMonth = 30;
  const dailyFixed = fixedCosts / daysInMonth;
  const dailyRevNeeded = dailyFixed; // simplification: assume same margin ratio

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Punto de Equilibrio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Costos Fijos Mensuales ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={fixedCosts || ''}
              placeholder="ej. 1500.00"
              onChange={e => handleChange(e.target.value)}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Alquiler, servicios, sueldos, etc. Se guarda localmente.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="rounded-lg bg-secondary/60 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Costo fijo/día</p>
              <p className="text-lg font-bold">${dailyFixed.toFixed(2)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${reached ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <p className="text-[10px] text-muted-foreground">Resultado neto</p>
              <p className={`text-lg font-bold ${reached ? 'text-emerald-600' : 'text-amber-600'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Ganancia bruta cubriendo costos fijos</span>
            <span className="font-semibold">{breakEvenPct.toFixed(1)}%</span>
          </div>
          <div className="h-4 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${reached ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.max(2, breakEvenPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>$0</span>
            {!reached && (
              <span className="text-amber-600 font-medium">
                Faltan ${Math.abs(netProfit).toFixed(2)} para el equilibrio
              </span>
            )}
            {reached && <span className="text-emerald-600 font-medium">¡Punto de equilibrio alcanzado!</span>}
            <span>${fixedCosts.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}