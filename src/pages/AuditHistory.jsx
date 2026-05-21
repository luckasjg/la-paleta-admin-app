import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Eye, TrendingDown, AlertTriangle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import moment from 'moment';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import AuditDetailDialog from '@/components/audits/AuditDetailDialog';
import AuditPrintReport from '@/components/audits/AuditPrintReport';

const shiftLabel = (s) => s === 'manana' ? 'Mañana' : s === 'tarde' ? 'Tarde' : s === 'noche' ? 'Noche' : '—';

export default function AuditHistory() {
  const { data: audits = [] } = useQuery({
    queryKey: ['ice_cream_audits'],
    queryFn: () => base44.entities.IceCreamAudit.list('-audit_date', 500),
  });

  const [from, setFrom] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [to, setTo] = useState(moment().format('YYYY-MM-DD'));
  const [selected, setSelected] = useState(null);
  const [printAudit, setPrintAudit] = useState(null);

  const filtered = useMemo(() => {
    return audits.filter(a => {
      if (!a.audit_date) return false;
      if (from && a.audit_date < from) return false;
      if (to && a.audit_date > to) return false;
      return true;
    });
  }, [audits, from, to]);

  // KPIs
  const totalVariance = filtered.reduce((s, a) => s + (a.total_variance_grams || 0), 0);
  const avgVariance = filtered.length ? totalVariance / filtered.length : 0;
  const worstAudit = filtered.reduce((worst, a) => {
    if (!worst) return a;
    return (a.total_variance_grams || 0) < (worst.total_variance_grams || 0) ? a : worst;
  }, null);

  // Datos para gráfico (ordenados ascendente por fecha)
  const chartData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (a.audit_date || '').localeCompare(b.audit_date || '') || (a.created_date || '').localeCompare(b.created_date || ''))
      .map(a => ({
        label: `${moment(a.audit_date).format('DD/MM')} ${shiftLabel(a.shift).slice(0, 3)}`,
        variance: a.total_variance_grams || 0,
      }));
  }, [filtered]);

  const handlePrint = (audit) => {
    setPrintAudit(audit);
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Auditorías"
        description="Compara la varianza de gramos entre auditorías e imprime reportes"
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Desde</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Hasta</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            {filtered.length} auditoría{filtered.length !== 1 ? 's' : ''} en el rango
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Auditorías" value={filtered.length} icon={ClipboardCheck} />
        <StatCard
          title="Varianza Total"
          value={`${totalVariance > 0 ? '+' : ''}${totalVariance.toFixed(0)}g`}
          icon={TrendingDown}
        />
        <StatCard
          title="Promedio por Auditoría"
          value={`${avgVariance > 0 ? '+' : ''}${avgVariance.toFixed(0)}g`}
        />
        <StatCard
          title="Peor Auditoría"
          value={worstAudit ? `${(worstAudit.total_variance_grams || 0).toFixed(0)}g` : '—'}
          subtitle={worstAudit ? moment(worstAudit.audit_date).format('DD/MM/YY') : ''}
        />
      </div>

      {/* Gráfico de comparación */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Evolución de Varianza (gramos)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay datos en el rango seleccionado.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v > 0 ? '+' : ''}${v.toFixed(0)}g`, 'Varianza']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="variance" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Listado de Auditorías</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-center">Bandejas</TableHead>
                <TableHead className="text-right">Varianza Total</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Sin auditorías en el rango</TableCell></TableRow>
              ) : (
                filtered.map(a => {
                  const v = a.total_variance_grams || 0;
                  const isBad = v < -50;
                  const isWarn = v < 0 && v >= -50;
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setSelected(a)}>
                      <TableCell className="text-sm">{moment(a.audit_date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell className="text-sm capitalize">{shiftLabel(a.shift)}</TableCell>
                      <TableCell className="text-center text-sm">{(a.entries || []).length}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={isBad ? 'bg-red-100 text-red-700 font-mono' : isWarn ? 'bg-yellow-100 text-yellow-700 font-mono' : 'bg-green-100 text-green-700 font-mono'}>
                          {isBad ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {v > 0 ? '+' : ''}{v.toFixed(0)}g
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.created_by || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => setSelected(a)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(a)} title="Imprimir">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuditDetailDialog audit={selected} open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }} />
      {printAudit && <AuditPrintReport audit={printAudit} />}
    </div>
  );
}