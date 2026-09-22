import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import DetailTable, { money, num } from './DetailTable';
import { BigLine, ChartBlock } from './DetailCharts';
import { useExchangeRate } from '@/lib/useExchangeRate';

const bs = (v) => `Bs. ${Number(v || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Exposición cambiaria en detalle: saldo por billetera VES, valor histórico vs
 * actual y evolución de la tasa de ingreso de los bolívares recibidos.
 */
export default function CurrencyDetail() {
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

  const data = useMemo(() => {
    const vesWallets = wallets.filter(w => w.currency === 'VES' && w.is_active !== false);
    const ids = new Set(vesWallets.map(w => w.id));
    const incomes = txs.filter(t =>
      ids.has(t.wallet_id) &&
      ['sale_income', 'conversion_in', 'initial_balance'].includes(t.type) &&
      (t.amount_native || 0) > 0
    );

    const totalVesIn = incomes.reduce((s, t) => s + (t.amount_native || 0), 0);
    const totalUsdIn = incomes.reduce((s, t) => s + (t.amount_usd_equivalent || 0), 0);
    const avgRate = totalUsdIn > 0 ? totalVesIn / totalUsdIn : todayRate;

    const walletRows = vesWallets.map(w => {
      const balance = w.balance || 0;
      const historical = avgRate > 0 ? balance / avgRate : 0;
      const current = todayRate > 0 ? balance / todayRate : 0;
      return {
        id: w.id,
        billetera: w.name,
        balance,
        historical,
        current,
        diff: current - historical,
      };
    });

    // Evolución de la tasa promedio de ingreso, mes a mes (últimos 12 meses)
    const monthly = {};
    incomes.forEach(t => {
      const d = t.transaction_date || t.created_date;
      if (!d) return;
      const key = moment(d).format('YYYY-MM');
      if (!monthly[key]) monthly[key] = { key, label: moment(d).format('MMM YY'), ves: 0, usd: 0 };
      monthly[key].ves += t.amount_native || 0;
      monthly[key].usd += t.amount_usd_equivalent || 0;
    });
    const rateSeries = Object.values(monthly)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12)
      .map(m => ({ ...m, tasa: m.usd > 0 ? m.ves / m.usd : 0 }));

    const vesBalance = walletRows.reduce((s, r) => s + r.balance, 0);
    const historicalUsd = walletRows.reduce((s, r) => s + r.historical, 0);
    const currentUsd = walletRows.reduce((s, r) => s + r.current, 0);

    return {
      walletRows,
      rateSeries,
      vesBalance,
      historicalUsd,
      currentUsd,
      differential: currentUsd - historicalUsd,
      avgRate,
      incomeCount: incomes.length,
    };
  }, [wallets, txs, todayRate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Saldo VES total', value: bs(data.vesBalance) },
          { label: 'Tasa de hoy', value: bs(todayRate) },
          { label: 'Tasa prom. de ingreso', value: bs(data.avgRate) },
          { label: 'Diferencial', value: `${data.differential >= 0 ? '+' : '-'}${money(Math.abs(data.differential))}` },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-base font-bold font-mono">{k.value}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-lg border-2 p-4 ${data.differential < -0.01 ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-300 bg-emerald-50'}`}>
        <p className="text-sm font-semibold">
          Valor histórico {money(data.historicalUsd)} → valor actual {money(data.currentUsd)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          El diferencial refleja cuánto valor en dólares ganó o perdió el saldo en bolívares
          entre el momento en que ingresó y la tasa vigente hoy. Basado en {num(data.incomeCount)} movimientos de ingreso.
        </p>
      </div>

      <ChartBlock title="Tasa promedio de ingreso por mes" note="Últimos 12 meses con ingresos en bolívares">
        <BigLine data={data.rateSeries} xKey="label" lines={[{ key: 'tasa', name: 'Bs. por USD' }]} valueFormat={bs} height={300} />
      </ChartBlock>

      <DetailTable
        title="Saldo por billetera en bolívares"
        columns={[
          { key: 'billetera', label: 'Billetera' },
          { key: 'balance', label: 'Saldo VES', align: 'right', format: bs },
          { key: 'historical', label: 'Valor histórico', align: 'right', format: money },
          { key: 'current', label: 'Valor actual', align: 'right', format: money },
          { key: 'diff', label: 'Diferencial', align: 'right', format: (v) => `${v >= 0 ? '+' : '-'}${money(Math.abs(v))}` },
        ]}
        rows={data.walletRows}
        footer={{
          billetera: 'Total',
          balance: data.vesBalance,
          historical: data.historicalUsd,
          current: data.currentUsd,
          diff: data.differential,
        }}
        emptyText="No hay billeteras en bolívares configuradas"
      />

      <DetailTable
        title="Ingresos de bolívares por mes"
        columns={[
          { key: 'label', label: 'Mes' },
          { key: 'ves', label: 'Bolívares recibidos', align: 'right', format: bs },
          { key: 'usd', label: 'Equivalente USD', align: 'right', format: money },
          { key: 'tasa', label: 'Tasa promedio', align: 'right', format: bs },
        ]}
        rows={data.rateSeries}
        emptyText="Sin ingresos en bolívares registrados"
      />
    </div>
  );
}