import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowRightLeft, Wallet as WalletIcon, History, RefreshCw, CreditCard } from 'lucide-react';
import PaymentMethodsManager from '@/components/wallets/PaymentMethodsManager';
import { toast } from 'sonner';
import moment from 'moment';
import PageHeader from '@/components/shared/PageHeader';
import WalletForm from '@/components/wallets/WalletForm';
import ConversionDialog from '@/components/wallets/ConversionDialog';
import { formatUSD, formatVES } from '@/lib/useExchangeRate';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const txTypeLabels = {
  sale_income: 'Venta',
  conversion_out: 'Conversión (salida)',
  conversion_in: 'Conversión (entrada)',
  manual_adjust: 'Ajuste manual',
  initial_balance: 'Saldo inicial',
};

export default function Wallets() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [historyWallet, setHistoryWallet] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: txs = [] } = useQuery({
    queryKey: ['wallet_transactions'],
    queryFn: () => base44.entities.WalletTransaction.list('-transaction_date', 500),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // CRÍTICO: decidir por el id que viene en `data`, no por el closure `editing`.
      // Esto evita crear duplicados si el estado `editing` se limpia antes de la mutación.
      const { id, ...payload } = data;
      if (id) {
        await base44.entities.Wallet.update(id, payload);
      } else {
        await base44.entities.Wallet.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      setFormOpen(false);
      setEditing(null);
      toast.success('Billetera guardada');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Wallet.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Billetera eliminada');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Migrar ventas históricas: calcula saldo inicial sumando todas las ventas
  // pasadas por método de pago y crea WalletTransaction tipo "initial_balance".
  const migrateHistoricalSales = async () => {
    setMigrating(true);
    try {
      // Cargar todas las ventas completadas
      const allSales = [];
      let page = 0;
      while (page < 50) {
        const batch = await base44.entities.Sale.list('-sale_date', 500, page * 500);
        if (!batch || batch.length === 0) break;
        allSales.push(...batch);
        if (batch.length < 500) break;
        page++;
      }
      const validSales = allSales.filter(s => s.status !== 'voided');

      // Agrupar pagos por método
      const byMethod = {}; // method -> { native, usd_eq, weighted_rate_num, total_native }
      for (const sale of validSales) {
        const payments = sale.payments || [];
        const rate = sale.exchange_rate || 1;
        for (const p of payments) {
          if (!p.method) continue;
          const entry = byMethod[p.method] || { total_native: 0, total_usd_eq: 0, rate };
          // Monto nativo según método
          let native = 0;
          if (p.method === 'efectivo_usd' || p.method === 'zelle') {
            native = p.amount_usd || p.amount_usd_equivalent || 0;
          } else {
            native = p.amount_ves || ((p.amount_usd_equivalent || 0) * rate);
          }
          entry.total_native += native;
          entry.total_usd_eq += p.amount_usd_equivalent || 0;
          byMethod[p.method] = entry;
        }
      }

      // Para cada billetera, sumar los métodos vinculados
      let touched = 0;
      for (const w of wallets) {
        if (w.is_active === false) continue;
        let totalNative = 0;
        let totalUsdEq = 0;
        for (const m of (w.payment_methods || [])) {
          const data = byMethod[m];
          if (!data) continue;
          totalNative += data.total_native;
          totalUsdEq += data.total_usd_eq;
        }
        if (totalNative <= 0) continue;

        // Crear movimiento de saldo inicial
        await base44.entities.WalletTransaction.create({
          wallet_id: w.id,
          wallet_name: w.name,
          type: 'initial_balance',
          amount_native: totalNative,
          amount_usd_equivalent: totalUsdEq,
          exchange_rate: w.currency === 'VES' && totalUsdEq > 0 ? totalNative / totalUsdEq : 1,
          notes: 'Migración de ventas históricas',
          transaction_date: new Date().toISOString(),
        });
        // Sumar al balance actual
        await base44.entities.Wallet.update(w.id, {
          balance: (w.balance || 0) + totalNative,
        });
        touched++;
      }

      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      toast.success(`Migración completada: ${touched} billeteras actualizadas`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMigrating(false);
    }
  };

  const totalsUSD = useMemo(() => wallets
    .filter(w => w.currency === 'USD' && w.is_active !== false)
    .reduce((s, w) => s + (w.balance || 0), 0), [wallets]);

  const totalsVES = useMemo(() => wallets
    .filter(w => w.currency === 'VES' && w.is_active !== false)
    .reduce((s, w) => s + (w.balance || 0), 0), [wallets]);

  const walletTxs = historyWallet ? txs.filter(t => t.wallet_id === historyWallet.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billeteras"
        description="Gestiona las cuentas del negocio y monitorea el flujo entre monedas"
        actions={
          <div className="flex gap-2 flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={migrating || wallets.length === 0}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${migrating ? 'animate-spin' : ''}`} />
                  Migrar ventas históricas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Migrar ventas históricas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto sumará al saldo de cada billetera el total de las ventas pasadas
                    en sus métodos de pago vinculados. Solo debes hacerlo UNA vez al
                    configurar el sistema. Si ya retiraste dinero, los saldos quedarán
                    inflados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={migrateHistoricalSales}>Migrar ahora</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" size="sm" onClick={() => setMethodsOpen(true)}>
              <CreditCard className="h-4 w-4 mr-1" /> Métodos de Pago
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConversionOpen(true)} disabled={wallets.length < 2}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Conversión
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nueva Billetera
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total USD</p>
            <p className="text-2xl font-bold font-mono">{formatUSD(totalsUSD)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total VES</p>
            <p className="text-2xl font-bold font-mono">{formatVES(totalsVES)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {wallets.map(w => (
          <Card key={w.id} className={w.is_active === false ? 'opacity-50' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <WalletIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <CardTitle className="text-sm truncate">{w.name}</CardTitle>
                </div>
                <Badge variant={w.currency === 'USD' ? 'default' : 'secondary'} className="text-[10px]">
                  {w.currency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold font-mono">
                {w.currency === 'USD' ? formatUSD(w.balance || 0) : formatVES(w.balance || 0)}
              </p>
              {(w.payment_methods || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(w.payment_methods || []).map(m => (
                    <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
                  ))}
                </div>
              )}
              {w.notes && <p className="text-[11px] text-muted-foreground">{w.notes}</p>}
              <div className="flex gap-1 pt-2 border-t">
                <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => setHistoryWallet(w)}>
                  <History className="h-3 w-3 mr-1" /> Movimientos
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(w); setFormOpen(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar billetera?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Los movimientos históricos permanecerán como registro.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(w.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {wallets.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <WalletIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No hay billeteras configuradas</p>
            <p className="text-xs">Crea una para comenzar a registrar el flujo de dinero</p>
          </div>
        )}
      </div>

      <WalletForm
        open={formOpen}
        onOpenChange={setFormOpen}
        wallet={editing}
        isEditing={!!editing}
        onSave={(data) => saveMutation.mutate(data)}
      />

      <ConversionDialog
        open={conversionOpen}
        onOpenChange={setConversionOpen}
        wallets={wallets}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['wallets'] });
          qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
        }}
      />

      <PaymentMethodsManager open={methodsOpen} onOpenChange={setMethodsOpen} />

      <Dialog open={!!historyWallet} onOpenChange={(o) => !o && setHistoryWallet(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Movimientos — {historyWallet?.name}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {walletTxs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos</p>
            ) : (
              <div className="space-y-1.5">
                {walletTxs.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs border-b py-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{txTypeLabels[t.type] || t.type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {moment(t.transaction_date).format('DD/MM/YYYY HH:mm')}
                        {t.notes ? ` · ${t.notes}` : ''}
                      </p>
                    </div>
                    <div className="text-right font-mono flex-shrink-0">
                      <p className={`font-semibold ${(t.amount_native || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {(t.amount_native || 0) >= 0 ? '+' : ''}
                        {historyWallet?.currency === 'USD'
                          ? formatUSD(t.amount_native || 0)
                          : formatVES(t.amount_native || 0)}
                      </p>
                      {t.exchange_rate && historyWallet?.currency === 'VES' && (
                        <p className="text-[9px] text-muted-foreground">
                          tasa: {t.exchange_rate.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}