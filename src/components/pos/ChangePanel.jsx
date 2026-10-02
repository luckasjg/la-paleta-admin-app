import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatEUR, EUR_PER_USD } from '@/lib/useExchangeRate';
import ChangeTramoRow from '@/components/pos/ChangeTramoRow';
import { makeTramo, tramosTotalUsd } from '@/lib/changeTramos';

/**
 * Panel de vuelto por tramos: aparece sólo cuando el cliente pagó de más.
 * El cajero reparte el exceso en uno o varios tramos (efectivo, pago móvil,
 * transferencia), cada uno con su moneda y billetera de salida.
 */
export default function ChangePanel({ excessUSD, eurVes, wallets, tramos, onChange }) {
  const activeWallets = wallets.filter(w => w.is_active !== false);
  const assignedUSD = tramosTotalUsd(tramos, eurVes);
  const remainingUSD = excessUSD - assignedUSD;
  const balanced = Math.abs(remainingUSD) <= 0.01;

  const update = (id, patch) => onChange(tramos.map(t => {
    if (t.id !== id) return t;
    const next = { ...t, ...patch };
    // Al cambiar de moneda se reconvierte el monto para conservar el valor.
    if (patch.currency && patch.currency !== t.currency && t.amount !== '') {
      const usd = tramosTotalUsd([t], eurVes);
      next.amount = (patch.currency === 'EUR' ? usd * EUR_PER_USD : usd * EUR_PER_USD * eurVes).toFixed(2);
    }
    return next;
  }));

  const addTramo = () => onChange([...tramos, makeTramo(Math.max(0, remainingUSD), eurVes, 'VES')]);

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs uppercase tracking-wide text-amber-800">Vuelto a entregar</Label>
        <span className="font-mono text-lg font-bold text-amber-900">{formatEUR(excessUSD * EUR_PER_USD)}</span>
      </div>

      {tramos.map((t, i) => (
        <ChangeTramoRow
          key={t.id}
          tramo={t}
          index={i}
          wallets={activeWallets}
          canRemove={tramos.length > 1}
          onChange={patch => update(t.id, patch)}
          onRemove={() => onChange(tramos.filter(x => x.id !== t.id))}
        />
      ))}

      <Button variant="outline" size="sm" className="w-full bg-white" onClick={addTramo}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Agregar tramo de vuelto
      </Button>

      <p className={`text-[11px] font-mono ${balanced ? 'text-emerald-700' : 'text-destructive'}`}>
        {balanced
          ? '✓ Los tramos cubren el vuelto completo'
          : remainingUSD > 0
            ? `Falta repartir ${formatEUR(remainingUSD * EUR_PER_USD)}`
            : `Te pasaste por ${formatEUR(-remainingUSD * EUR_PER_USD)}`}
      </p>
      {tramos.some(t => t.method !== 'efectivo') && (
        <p className="text-[10px] text-amber-800">
          Cada tramo digital se notifica a Slack (#caja) y queda en la cola de devoluciones.
        </p>
      )}
    </div>
  );
}