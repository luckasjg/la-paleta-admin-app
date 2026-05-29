import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CONNECTOR_ID = '6a18ea9c0da9a2b27b53e4c2';

export default function SlackConnectionCard() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const checkConnection = async () => {
    try {
      const res = await base44.functions.invoke('notifySlackCashClose', { __probe: true });
      // El backend devuelve {skipped:true, reason:'no register...'} si la conexión existe
      // y {skipped:true, reason:'operator has no slack connection'} si no existe.
      const reason = res?.data?.reason || '';
      setConnected(!reason.includes('no slack connection'));
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    (async () => {
      await checkConnection();
      setLoading(false);
    })();
  }, []);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          await checkConnection();
          setWorking(false);
        }
      }, 500);
    } catch (e) {
      toast.error(e.message || 'No se pudo iniciar la conexión');
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    setWorking(true);
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      toast.success('Slack desconectado');
    } catch (e) {
      toast.error(e.message || 'No se pudo desconectar');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Alertas de Slack — Cierre de Caja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Conecta tu cuenta de Slack para que, cada vez que <strong>tú cierres caja</strong>,
          se envíe automáticamente un resumen al canal <code className="text-xs bg-secondary px-1 py-0.5 rounded">#caja</code>
          con total de ventas, efectivo, diferencia, turno y N° de transacciones.
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          {loading ? (
            <Badge variant="secondary">Verificando…</Badge>
          ) : connected ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              <AlertCircle className="h-3 w-3 mr-1" /> No conectado
            </Badge>
          )}

          {connected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={working}>
              Desconectar
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={working || loading}>
              {working ? 'Conectando…' : 'Conectar Slack'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}