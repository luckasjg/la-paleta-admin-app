import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Coins, AlertCircle } from 'lucide-react';
import { useExchangeRate, formatUSD, formatVES } from '@/lib/useExchangeRate';

/**
 * Panel de Exposición Cambiaria.
 *
 * Cálculo (Solo saldo actual VES):
 * - Toma el saldo VES actual de todas las billeteras activas.
 * - "Valor Histórico USD" = suma del USD equivalente con el que entró cada Bs
 *   que aún está en las billeteras (aproximado con la tasa promedio ponderada
 *   de ingresos VES, multiplicada por el saldo actual).
 * - "Valor Actual USD"     = saldo VES total / tasa de HOY (la del sistema).
 * - Diferencial             = Actual − Histórico  (negativo = pérdida por devaluación)
 */
export default function CurrencyExposurePanel() {
  const { rate: todayRate } = useExchangeRate();

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: txs = [] } = useQuery({
    queryKey: ['wallet_transactions'],
    queryFn: async () => {
      const all = [];
      let page = 0;
      while (page < 20) {
        const batch = await base44.entities.WalletTransaction.list('-transaction_date', 500, page * 500);
        if (!batch || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 500) break;
        page++;
      }
      return all;
    },
  });

  const exposure = useMemo(() => {
    const vesWallets = wallets.filter(w => w.currency === 'VES' && w.is_active !== false);
    const vesBalance = vesWallets.reduce((s, w) => s + (w.balance || 0), 0);

    // Tasa promedio ponderada de ingresos VES (saldo histórico)
    // Solo consideramos entradas (sale_income, conversion_in, initial_balance) en billeteras VES
    const vesWalletIds = new Set(vesWallets.map(w => w.id));
    const vesIncomeTxs = txs.filter(t =>
      vesWalletIds.has(t.wallet_id) &&
      ['sale_income', 'conversion_in', 'initial_balance'].includes(t.type) &&
      (t.amount_native || 0) > 0
    );

    const totalVesIn = vesIncomeTxs.reduce((s, t) => s + (t.amount_native || 0), 0);
    const totalUsdEqIn = vesIncomeTxs.reduce((s, t) => s + (t.amount_usd_equivalent || 0), 0);
    const avgRate = totalVesIn > 0 ? totalVesIn / totalUsdEqIn : todayRate;

    // Valor histórico: lo que valía en USD ese saldo VES en el momento de su ingreso (aprox)
    const historicalUsd = avgRate > 0 ? vesBalance / avgRate : 0;
    // Valor actual: lo que vale HOY
    const currentUsd = todayRate > 0 ? vesBalance / todayRate : 0;
    const differential = currentUsd - historicalUsd;
    const percentChange = historicalUsd > 0 ? (differential / historicalUsd) * 100 : 0;

    return {
      vesBalance,
      avgRate,
      historicalUsd,
      currentUsd,
      differential,
      percentChange,
      hasData: totalVesIn > 0,
      walletCount: vesWallets.length,
    };
  }, [wallets, txs, todayRate]);

  const isLoss = exposure.differential < -0.01;
  const isGain = exposure.differential > 0.01;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-600" />
          Exposición Cambiaria (VES)
          <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
            Tasa hoy: Bs. {todayRate.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exposure.walletCount === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <AlertCircle className="h-4 w-4" />
            No hay billeteras en VES configuradas
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Saldo VES total</p>
                <p className="text-base font-bold font-mono">{formatVES(exposure.vesBalance)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Tasa prom. ingreso</p>
                <p className="text-base font-bold font-mono">Bs. {exposure.avgRate.toFixed(2)}</p>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor histórico (USD)</span>
                <span className="font-mono font-semibold">{formatUSD(exposure.historicalUsd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor actual (USD)</span>
                <span className="font-mono font-semibold">{formatUSD(exposure.currentUsd)}</span>
              </div>
            </div>

            <div className={`rounded-lg p-3 border-2 ${
              isLoss ? 'border-destructive/30 bg-destructive/5' :
              isGain ? 'border-emerald-300 bg-emerald-50' :
              'border-border bg-secondary/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isLoss ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : isGain ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : null}
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {isLoss ? 'Pérdida' : isGain ? 'Ganancia' : 'Neutro'} por diferencial
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold font-mono ${
                    isLoss ? 'text-destructive' : isGain ? 'text-emerald-600' : ''
                  }`}>
                    {isLoss ? '-' : isGain ? '+' : ''}{formatUSD(Math.abs(exposure.differential))}
                  </p>
                  {exposure.hasData && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {exposure.percentChange.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!exposure.hasData && exposure.walletCount > 0 && (
              <p className="text-[10px] text-muted-foreground italic">
                Aún no hay ingresos VES registrados — el diferencial se calculará cuando comiencen las ventas en bolívares.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}