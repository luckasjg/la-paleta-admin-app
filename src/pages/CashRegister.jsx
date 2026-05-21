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
import { DollarSign, AlertTriangle, CheckCircle, Printer, Eye, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';
import moment from 'moment';
import SaleDetailDialog from '@/components/cashregister/SaleDetailDialog';
import PrintReport from '@/components/cashregister/PrintReport';
import IceCreamAudit from '@/components/cashregister/IceCreamAudit';
import ClosingDetailDialog from '@/components/cashregister/ClosingDetailDialog';

export default function CashRegister() {
  const [closeDialog, setCloseDialog] = useState(false);
  const [declaredCash, setDeclaredCash] = useState(0);
  const [shift, setShift] = useState('manana');
  const [notes, setNotes] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [viewingRegister, setViewingRegister] = useState(null);
  const [printContext, setPrintContext] = useState(null);
  const qc = useQueryClient();

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

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const activeTrays = trays.filter(t => t.status === 'activa');

  const today = moment().format('YYYY-MM-DD');
  const todaySales = useMemo(
    () => sales.filter(s => s.sale_date && moment(s.sale_date).format('YYYY-MM-DD') === today),
    [sales, today]
  );

  const systemCash = todaySales.reduce((sum, s) => sum + (s.cash_amount || 0), 0);
  const systemDigital = todaySales.reduce((sum, s) => sum + (s.digital_amount || 0), 0);
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

  const getSalesForRegister = (register) => {
    if (!register) return [];
    const regDate = register.date;
    const regCreated = register.created_date ? moment(register.created_date) : null;
    return sales.filter(s => {
      if (!s.sale_date) return false;
      if (moment(s.sale_date).format('YYYY-MM-DD') !== regDate) return false;
      if (register.shift && s.shift && s.shift !== register.shift) return false;
      if (regCreated && moment(s.sale_date).isAfter(regCreated)) return false;
      return true;
    });
  };

  const closeMut = useMutation({
    mutationFn: async () => {
      await base44.entities.CashRegister.create({
        date: today,
        shift,
        system_cash: systemCash,
        system_digital: systemDigital,
        declared_cash: declaredCash,
        difference: declaredCash - systemCash,
        total_sales: todayTotal,
        sales_count: todaySales.length,
        notes,
        status: 'cerrada',
        operator: me?.email || me?.full_name || '',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash_registers'] });
      setCloseDialog(false);
      toast.success('Caja cerrada exitosamente');
    },
  });

  const printToday = () => {
    setPrintContext({
      date: today,
      shift,
      operator: me?.email || me?.full_name || '',
      sales: todaySales,
      register: null,
    });
    setTimeout(() => window.print(), 50);
  };

  const reprintRegister = (register) => {
    const regSales = getSalesForRegister(register);
    setPrintContext({
      date: register.date,
      shift: register.shift,
      operator: register.operator || register.created_by || '',
      sales: regSales,
      register,
    });
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja Registradora"
        description={`Hoy: ${moment().format('DD/MM/YYYY')}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={printToday}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir Reporte
            </Button>
            <Button onClick={() => setCloseDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" /> Cerrar Caja
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="history">Historial de Cierres</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Ventas Hoy" value={`$${todayTotal.toFixed(2)}`} icon={DollarSign} />
            <StatCard title="Transacciones" value={todaySales.length} />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySales.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sin ventas hoy</TableCell></TableRow>
                  ) : (
                    todaySales.map(s => {
                      const hasCourtesy = (s.items || []).some(i => i.is_courtesy);
                      return (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-secondary/40"
                          onClick={() => setSelectedSale(s)}
                        >
                          <TableCell className="text-sm">{moment(s.sale_date).format('HH:mm')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>{(s.items || []).map(i => i.product_name).join(', ').slice(0, 35) || '—'}</span>
                              {hasCourtesy && <span title="Incluye cortesías" className="text-amber-500 text-xs">🎁</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {s.payment_method === 'efectivo' ? 'Efectivo' : s.payment_method === 'pago_movil' ? 'P. Móvil' : s.payment_method === 'punto_venta' ? 'Tarjeta' : 'Mixto'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">${s.total?.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <IceCreamAudit
            activeTrays={activeTrays}
            todaySales={todaySales}
            shift={shift}
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
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Sin cierres registrados</TableCell></TableRow>
                  ) : (
                    registers.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{moment(r.date).format('DD/MM/YY')}</TableCell>
                        <TableCell className="capitalize">{r.shift === 'manana' ? 'Mañana' : r.shift === 'tarde' ? 'Tarde' : 'Noche'}</TableCell>
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
                <div><span className="text-muted-foreground">Transacciones:</span> <span className="font-semibold">{todaySales.length}</span></div>
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