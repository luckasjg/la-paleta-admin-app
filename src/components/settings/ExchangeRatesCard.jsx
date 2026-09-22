import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Coins } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { useExchangeRate, RATES_QUERY_KEY } from '@/lib/useExchangeRate';

export default function ExchangeRatesCard() {
  const qc = useQueryClient();
  const {
    usdVes, eurVes, eurPerUsd, isManual, lastFetch, lastError,
    autoUsdVes, autoEurVes, setRate,
  } = useExchangeRate();

  const [manual, setManual] = useState(isManual);
  const [manualUsd, setManualUsd] = useState('');
  const [manualEur, setManualEur] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setManual(isManual);
    setManualUsd(String(usdVes.toFixed(2)));
    setManualEur(String(eurVes.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManual, lastFetch]);

  const syncNow = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('fetchBcvRates', {});
      if (res.data?.ok) toast.success('Tasas del BCV actualizadas');
      else toast.error('El BCV no devolvió tasas nuevas. Se conservan las anteriores.');
      await qc.invalidateQueries({ queryKey: RATES_QUERY_KEY });
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const saveManual = async (enabled) => {
    setBusy(true);
    try {
      await setRate({
        usdVes: parseFloat(manualUsd) || autoUsdVes,
        eurVes: parseFloat(manualEur) || autoEurVes,
        enabled,
      });
      setManual(enabled);
      toast.success(enabled ? 'Tasa manual activada' : 'Volvimos a la tasa automática del BCV');
    } catch (e) {
      toast.error('No se pudo guardar la tasa (solo administradores)');
    }
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" /> Tasas de cambio (BCV)
            </CardTitle>
            <CardDescription>
              Se sincronizan automáticamente dos veces al día y las comparten todas las cajas.
            </CardDescription>
          </div>
          <Badge variant={isManual ? 'destructive' : 'secondary'}>
            {isManual ? 'Manual' : 'Automática'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dólar BCV</p>
            <p className="text-xl font-bold font-mono">Bs. {usdVes.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Euro BCV</p>
            <p className="text-xl font-bold font-mono">Bs. {eurVes.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cobro POS: 1 USD</p>
            <p className="text-xl font-bold font-mono text-primary">€ {eurPerUsd.toFixed(4)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Última consulta:{' '}
          <span className="font-mono">{lastFetch ? moment(lastFetch).format('DD/MM/YYYY HH:mm') : 'nunca'}</span>
          {lastError ? <span className="text-destructive"> · último error: {lastError}</span> : null}
        </p>

        <Button variant="outline" onClick={syncNow} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-1 ${busy ? 'animate-spin' : ''}`} /> Sincronizar ahora
        </Button>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm">Usar tasa manual</Label>
              <p className="text-xs text-muted-foreground">
                Ignora la tasa automática del BCV hasta que lo desactives.
              </p>
            </div>
            <Switch checked={manual} onCheckedChange={v => saveManual(v)} disabled={busy} />
          </div>

          {manual && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">1 USD = Bs.</Label>
                <Input type="number" step="0.01" min="0" value={manualUsd}
                  onChange={e => setManualUsd(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">1 EUR = Bs.</Label>
                <Input type="number" step="0.01" min="0" value={manualEur}
                  onChange={e => setManualEur(e.target.value)} className="font-mono" />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saveManual(true)} disabled={busy} className="w-full">
                  Guardar tasas manuales
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}