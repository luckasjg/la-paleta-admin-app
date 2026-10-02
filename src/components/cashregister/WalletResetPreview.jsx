import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';

const fmt = (n, cur) => `${cur === 'VES' ? 'Bs.' : cur === 'EUR' ? '€' : '$'} ${(n || 0).toFixed(2)}`;

/** Resumen del saldo de cada billetera antes y después del vaciado por cierre. */
export default function WalletResetPreview() {
  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });
  const active = wallets.filter(w => w.is_active !== false);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 space-y-1.5">
      <p className="text-[11px] text-amber-800">
        Al confirmar, <strong>todas</strong> las billeteras se reinician a 0 y queda registro en Auditoría de Fondos.
      </p>
      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Cargando billeteras…</p>
      ) : (
        <div className="max-h-32 overflow-y-auto space-y-0.5">
          {active.map(w => (
            <div key={w.id} className="flex items-center justify-between text-[11px] font-mono">
              <span className="truncate font-sans">{w.name}</span>
              <span className="flex items-center gap-1 shrink-0">
                <span className={(w.balance || 0) < 0 ? 'text-destructive' : ''}>{fmt(w.balance, w.currency)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{fmt(0, w.currency)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}