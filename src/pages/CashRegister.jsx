import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, AlertTriangle, CheckCircle, Printer, Eye, RefreshCw, UserCog } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';
import moment from 'moment';
import SaleDetailDialog from '@/components/cashregister/SaleDetailDialog';
import PrintReport from '@/components/cashregister/PrintReport';
import IceCreamAudit from '@/components/cashregister/IceCreamAudit';
import ClosingDetailDialog from '@/components/cashregister/ClosingDetailDialog';
import VoidSaleButton from '@/components/cashregister/VoidSaleButton';
import StaffChangeDialog from '@/components/cashregister/StaffChangeDialog';
import PaymentMethodBadge from '@/components/cashregister/PaymentMethodBadge';
import { Ban } from 'lucide-react';
import { consolidateWallet as consolidateWalletFn } from '@/lib/consolidationHelpers';
import { useExchangeRate } from '@/lib/useExchangeRate';
import { getActiveSession, clearActiveSession } from '@/lib/cashSession';
import { getPendingAuditRegisters } from '@/lib/pendingAudits';
import PendingAuditsBanner from '@/components/cashregister/PendingAuditsBanner';

export default function CashRegister() {
  const [closeDialog, setCloseDialog] = useState(false);
  const [staffChangeOpen, setStaffChangeOpen] = useState(false);
  const [declaredCash, setDeclaredCash] = useState(0);
  const [shift, setShift] = useState('manana');
  const [notes, setNotes] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [viewingRegister, setViewingRegister] = useState(null);
  const [printContext, setPrintContext] = useState(null);
  const [auditingRegister, setAuditingRegister] = useState(null);
  const qc = useQueryClient();
  const { rate } = useExchangeRate();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-sale_date', 2000),
  });

  const { data: registers = [] } = useQuery({
    queryKey: ['cash_registers'],
    queryFn: () => base44.entities.CashRegister.list('-created_date', 100),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const { data: trays = [] } = useQuery({
    queryKey: ['trays'],
    queryFn: () => base44.entities.Tray.list('-created_date', 50),
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['ice_cream_audits'],
    queryFn: () => base44.entities.IceCreamAudit.list('-created_date', 200),
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const activeTrays = trays.filter(t => t.status === 'activa');

  const today = moment().format('YYYY-MM-DD');

  // Cierres del día actual, ordenados por fecha de creación ascendente
  const todayRegisters = useMemo(
    () => registers
      .filter(r => r.date === today && r.status === 'cerrada')
      .sort((a, b) => moment(a.created_date).valueOf() - moment(b.created_date).valueOf()),
    [registers, today]
  );

  // Marca de tiempo del último cierre del día (si hay)
  const lastCloseTime = useMemo(() => {
    if (todayRegisters.length === 0) return null;
    const last = todayRegisters[todayRegisters.length - 1];
    return last.created_date ? moment(last.created_date) : null;
  }, [todayRegisters]);

  // Ventas del día calendario (base para el modo sin sesión abierta)
  const calendarSales = useMemo(
    () => sales.filter(s => s.sale_date && moment(s.sale_date).format('YYYY-MM-DD') === today),
    [sales, today]
  );

  // Sesión de caja activa: la FUENTE DE VERDAD es el backend (registers con
  // status='abierta'), no el localStorage. Así, aunque se pierda el localStorage
  // por caída de conexión o cambio de dispositivo, el cierre siempre actualiza
  // la sesión real abierta en lugar de crear una nueva.
  const activeSession = getActiveSession();
  const openRegister = useMemo(() => {
    const abiertas = registers.filter(r => r.status === 'abierta');
    if (abiertas.length === 0) return null;
    // Si el localStorage apunta a una sesión que sigue abierta, úsala.
    const matchLocal = activeSession?.id ? abiertas.find(r => r.id === activeSession.id) : null;
    if (matchLocal) return matchLocal;
    // Si no, tomamos la más reciente (por opened_at o created_date).
    return [...abiertas].sort((a, b) => {
      const ta = moment(a.opened_at || a.created_date).valueOf();
      const tb = moment(b.opened_at || b.created_date).valueOf();
      return tb - ta;
    })[0];
  }, [registers, activeSession?.id]);

  // Ventas pendientes de cierre. SIEMPRE consolidamos TODAS las ventas
  // vinculadas a la sesión abierta por cash_register_id, sin importar el día
  // ni la hora, para que un cierre tardío recoja todo lo registrado.
  // Sólo cuando no hay sesión abierta caemos al método legado por tiempo.
  const openSales = useMemo(() => {
    if (openRegister?.id) {
      return sales.filter(s =>
        s.status !== 'voided' && s.cash_register_id === openRegister.id
      );
    }
    return calendarSales.filter(s =>
      s.status !== 'voided' &&
      !s.cash_register_id &&
      (!lastCloseTime || moment(s.sale_date).isAfter(lastCloseTime))
    );
  }, [sales, calendarSales, lastCloseTime, openRegister?.id]);

  // Lista visible en la pestaña "Hoy": si la caja sigue abierta mostramos TODAS
  // las ventas de esa sesión (aunque el turno cruce la medianoche). Sólo cuando
  // no hay sesión abierta caemos al día calendario.
  const todaySales = useMemo(() => {
    if (openRegister?.id) {
      return sales.filter(s => s.cash_register_id === openRegister.id);
    }
    return calendarSales;
  }, [sales, calendarSales, openRegister?.id]);

  // Sesiones cerradas sin auditoría de helados registrada
  const pendingAudits = useMemo(
    () => getPendingAuditRegisters(registers, audits),
    [registers, audits]
  );

  const systemCash = openSales.reduce((sum, s) => sum + (s.cash_amount || 0), 0);
  const systemDigital = openSales.reduce((sum, s) => sum + (s.digital_amount || 0), 0);
  const todayTotal = openSales.reduce((sum, s) => sum + (s.total || 0), 0);

  // Ventas asociadas a un cierre. Si el cierre tiene ventas con cash_register_id,
  // esa es la fuente de verdad (sesiones nuevas). Si no, caemos al método legado
  // basado en rango horario entre cierres del mismo día.
  const getSalesForRegister = (register) => {
    if (!register) return [];
    const linked = sales.filter(s =>
      s.status !== 'voided' && s.cash_register_id === register.id
    );
    if (linked.length > 0) return linked;

    // Fallback legado: ventas del día entre el cierre anterior y este cierre
    const regDate = register.date;
    const regCreated = register.created_date ? moment(register.created_date) : null;
    const sameDay = registers
      .filter(r => r.date === regDate && r.status === 'cerrada' && r.created_date)
      .sort((a, b) => moment(a.created_date).valueOf() - moment(b.created_date).valueOf());
    const idx = sameDay.findIndex(r => r.id === register.id);
    const prev = idx > 0 ? sameDay[idx - 1] : null;
    const prevCreated = prev?.created_date ? moment(prev.created_date) : null;

    return sales.filter(s => {
      if (!s.sale_date) return false;
      if (s.status === 'voided') return false;
      if (s.cash_register_id) return false; // ya vinculadas a otra sesión
      if (moment(s.sale_date).format('YYYY-MM-DD') !== regDate) return false;
      if (regCreated && moment(s.sale_date).isAfter(regCreated)) return false;
      if (prevCreated && !moment(s.sale_date).isAfter(prevCreated)) return false;
      return true;
    });
  };

  const closeMut = useMutation({
    mutationFn: async () => {
      // Re-verificamos en el backend si hay alguna sesión abierta justo antes
      // de cerrar. Esto blinda el cierre incluso si el estado local quedó
      // desactualizado (caída de conexión, otro dispositivo, etc.) y garantiza
      // que NUNCA dejemos una sesión abierta huérfana.
      const freshOpen = await base44.entities.CashRegister.filter({ status: 'abierta' });
      const targetSession = openRegister || (freshOpen?.[0] ?? null);

      // 1) Si hay una sesión abierta, la cerramos (update). Si no, creamos un
      //    cierre suelto para conservar el comportamiento histórico.
      //    Conservamos la fecha original de la sesión abierta para que el cierre
      //    quede correctamente asociado al día en que se abrió.
      const closePayload = {
        date: targetSession?.date || today,
        shift,
        system_cash: systemCash,
        system_digital: systemDigital,
        declared_cash: declaredCash,
        difference: declaredCash - systemCash,
        total_sales: todayTotal,
        sales_count: openSales.length,
        notes,
        status: 'cerrada',
        operator: targetSession?.staff_name || me?.email || me?.full_name || '',
        closed_at: new Date().toISOString(),
      };

      const register = targetSession?.id
        ? await base44.entities.CashRegister.update(targetSession.id, closePayload)
        : await base44.entities.CashRegister.create(closePayload);

      // 1.b) Si quedaron OTRAS sesiones abiertas (escenario poco común tras una
      //      caída de conexión), las cerramos también de forma silenciosa con
      //      totales en cero para que el sistema no arrastre sesiones huérfanas.
      const otherOpen = (freshOpen || []).filter(r => r.id !== register?.id && r.status === 'abierta');
      for (const r of otherOpen) {
        try {
          await base44.entities.CashRegister.update(r.id, {
            status: 'cerrada',
            closed_at: new Date().toISOString(),
            notes: (r.notes || '') + ' [Cerrada automáticamente al detectar sesión huérfana]',
          });
        } catch (e) {
          console.error('No se pudo cerrar sesión huérfana:', r.id, e);
        }
      }

      // 2) Consolidación automática de billeteras vinculadas a las ventas del turno.
      //    Identificamos los métodos de pago usados en `openSales` y vaciamos las
      //    billeteras que los tengan vinculados, dejando un registro de auditoría.
      const usedMethods = new Set();
      for (const s of openSales) {
        for (const p of (s.payments || [])) {
          if (p?.method) usedMethods.add(p.method);
        }
      }

      let consolidated = 0;
      try {
        const wallets = await base44.entities.Wallet.list();
        const closedBy = me?.email || me?.full_name || '';
        for (const w of wallets) {
          if (w.is_active === false) continue;
          const balance = Number(w.balance) || 0;
          if (balance <= 0) continue;
          // Sólo consolidar billeteras que reciben dinero de las ventas del turno
          const linked = (w.payment_methods || []).some(m => usedMethods.has(m));
          if (!linked) continue;
          try {
            await consolidateWalletFn({
              wallet: w,
              amountNative: balance,
              destination: 'Liquidado por Cierre de Turno',
              exchangeRate: rate,
              source: 'cash_register_close',
              cashRegisterId: register?.id,
              closedBy,
              notes: `Turno ${shift} — ${today}`,
            });
            consolidated++;
          } catch (e) {
            console.error(`Error consolidando ${w.name}:`, e);
          }
        }
      } catch (e) {
        console.error('Error listando billeteras para consolidar:', e);
      }

      return { register, consolidated };
    },
    onSuccess: ({ consolidated }) => {
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      qc.invalidateQueries({ queryKey: ['wallet_consolidations'] });
      qc.invalidateQueries({ queryKey: ['active_cash_session'] });
      clearActiveSession();
      setCloseDialog(false);
      if (consolidated > 0) {
        toast.success(`Caja cerrada. ${consolidated} billetera(s) liquidada(s) automáticamente.`);
      } else {
        toast.success('Caja cerrada exitosamente');
      }
    },
    onError: (e) => toast.error(e.message || 'Error al cerrar caja'),
  });

  const printToday = () => {
    setPrintContext({
      date: today,
      shift: openRegister?.shift || shift,
      operator: openRegister?.staff_name || openRegister?.operator || '—',
      sales: openSales,
      register: openRegister || null,
    });
    setTimeout(() => window.print(), 50);
  };

  const reprintRegister = (register) => {
    const regSales = getSalesForRegister(register);
    setPrintContext({
      date: register.date,
      shift: register.shift,
      operator: register.staff_name || register.operator || '—',
      sales: regSales,
      register,
    });
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja Registradora"
        description={
          openRegister
            ? `Sesión abierta por ${openRegister.staff_name || openRegister.operator || '—'} · ${moment(openRegister.opened_at || openRegister.created_date).format('DD/MM HH:mm')}`
            : `Hoy: ${moment().format('DD/MM/YYYY')} · sin sesión abierta`
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            {openRegister && (
              <Button variant="outline" onClick={() => setStaffChangeOpen(true)}>
                <UserCog className="h-4 w-4 mr-2" /> Cambiar Cajero / Turno
              </Button>
            )}
            <Button variant="outline" onClick={printToday}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir Reporte
            </Button>
            <Button onClick={() => setCloseDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" /> Cerrar Caja
            </Button>
          </div>
        }
      />

      <StaffChangeDialog
        open={staffChangeOpen}
        onOpenChange={setStaffChangeOpen}
        register={openRegister}
      />

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="history">Historial de Cierres</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Ventas Hoy" value={`$${todayTotal.toFixed(2)}`} icon={DollarSign} />
            <StatCard title="Transacciones" value={openSales.length} />
            <StatCard title="Efectivo" value={`$${systemCash.toFixed(2)}`} />
            <StatCard title="Digital" value={`$${systemDigital.toFixed(2)}`} />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Ventas del Día</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Ítems</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySales.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sin ventas hoy</TableCell></TableRow>
                  ) : (
                    todaySales.map(s => {
                      const hasCourtesy = (s.items || []).some(i => i.is_courtesy);
                      const isVoided = s.status === 'voided';
                      return (
                        <TableRow
                          key={s.id}
                          className={`cursor-pointer hover:bg-secondary/40 ${isVoided ? 'opacity-50' : ''}`}
                          onClick={() => setSelectedSale(s)}
                        >
                          <TableCell className={`text-sm ${isVoided ? 'line-through' : ''}`}>
                            {moment(s.sale_date).format('HH:mm')}
                          </TableCell>
                          <TableCell className={`text-sm text-muted-foreground ${isVoided ? 'line-through' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span>{(s.items || []).map(i => i.product_name).join(', ').slice(0, 35) || '—'}</span>
                              {hasCourtesy && <span title="Incluye cortesías" className="text-amber-500 text-xs">🎁</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isVoided ? (
                              <Badge className="bg-gray-200 text-gray-600 text-xs">
                                <Ban className="h-3 w-3 mr-1" /> Anulada
                              </Badge>
                            ) : (
                              <PaymentMethodBadge sale={s} />
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${isVoided ? 'line-through text-muted-foreground' : ''}`}>
                            ${s.total?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <VoidSaleButton sale={s} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <PendingAuditsBanner
            pending={pendingAudits}
            selectedId={auditingRegister?.id}
            onSelect={setAuditingRegister}
          />

          <IceCreamAudit
            key={auditingRegister?.id || 'current'}
            activeTrays={activeTrays}
            todaySales={auditingRegister ? getSalesForRegister(auditingRegister) : todaySales}
            shift={auditingRegister?.shift || shift}
            recipes={recipes}
            supplies={supplies}
            cashRegisterId={auditingRegister?.id || openRegister?.id || null}
            auditDate={auditingRegister?.date || null}
            sessionLabel={auditingRegister ? `${moment(auditingRegister.date).format('DD/MM')} · ${auditingRegister.staff_name || auditingRegister.operator || '—'}` : null}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Cierres Anteriores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Total Ventas</TableHead>
                    <TableHead className="text-right">Efectivo Sistema</TableHead>
                    <TableHead className="text-right">Efectivo Declarado</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Sin cierres registrados</TableCell></TableRow>
                  ) : (
                    registers.filter(r => r.status === 'cerrada').map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{moment(r.date).format('DD/MM/YY')}</TableCell>
                        <TableCell className="capitalize">{r.shift === 'manana' ? 'Mañana' : r.shift === 'tarde' ? 'Tarde' : 'Noche'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.staff_name || r.operator || '—'}</TableCell>
                        <TableCell className="text-right font-mono">${r.total_sales?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${r.system_cash?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">${r.declared_cash?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {r.difference !== 0 && r.difference != null ? (
                            <Badge className={r.difference < 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {r.difference > 0 ? '+' : ''}{r.difference?.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" /> Cuadra
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-700">
                            {r.status === 'cerrada' ? 'Cerrado' : 'Abierto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewingRegister(r)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => reprintRegister(r)} title="Reimprimir">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SaleDetailDialog
        sale={selectedSale}
        supplies={supplies}
        open={!!selectedSale}
        onOpenChange={() => setSelectedSale(null)}
      />

      <ClosingDetailDialog
        register={viewingRegister}
        sales={viewingRegister ? getSalesForRegister(viewingRegister) : []}
        open={!!viewingRegister}
        onOpenChange={(v) => { if (!v) setViewingRegister(null); }}
      />

      {printContext && (
        <PrintReport
          date={printContext.date}
          shift={printContext.shift}
          operator={printContext.operator}
          sales={printContext.sales}
          supplies={supplies}
          register={printContext.register}
        />
      )}

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Arqueo y Cierre de Caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Card className="p-4 bg-secondary/50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Ventas:</span> <span className="font-semibold">${todayTotal.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Transacciones:</span> <span className="font-semibold">{openSales.length}</span></div>
                <div><span className="text-muted-foreground">Efectivo (sistema):</span> <span className="font-semibold">${systemCash.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Digital:</span> <span className="font-semibold">${systemDigital.toFixed(2)}</span></div>
              </div>
            </Card>
            <div>
              <Label>Turno</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noche">Noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Efectivo Físico Contado ($)</Label>
              <Input type="number" step="0.01" value={declaredCash} onChange={e => setDeclaredCash(parseFloat(e.target.value) || 0)} />
              {declaredCash !== systemCash && declaredCash > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className={declaredCash - systemCash < 0 ? 'text-destructive' : 'text-yellow-600'}>
                    Diferencia: {(declaredCash - systemCash) > 0 ? '+' : ''}{(declaredCash - systemCash).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales..." />
            </div>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Al confirmar, las billeteras vinculadas a las ventas de este turno se <strong>liquidarán a 0</strong> y quedará registro en <strong>Auditoría de Fondos</strong>.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
              {closeMut.isPending ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}