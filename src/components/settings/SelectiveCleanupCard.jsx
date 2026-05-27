import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from 'lucide-react';

// Departamentos disponibles para purgar. Cada uno define las entidades que vacía.
// IMPORTANTE: NO se incluyen Wallet, PaymentMethod, User, ni categorías.
const DEPARTMENTS = [
  {
    id: 'inventory',
    label: 'Inventario y Materia Prima',
    description: 'Vacía la tabla de insumos (Supply) y preparados intermedios (Preparation).',
    entities: ['Supply', 'Preparation'],
  },
  {
    id: 'recipes',
    label: 'Recetas y Fórmulas',
    description: 'Vacía la tabla de recetas (Recipe).',
    entities: ['Recipe'],
  },
  {
    id: 'production',
    label: 'Producción y Vitrina',
    description: 'Vacía bandejas de helado (Tray) y productos elaborados (Product).',
    entities: ['Tray', 'Product'],
  },
  {
    id: 'sales',
    label: 'Historial de Ventas y Caja',
    description: 'Vacía ventas (Sale), cierres de caja (CashRegister) y movimientos de billeteras (WalletTransaction).',
    entities: ['Sale', 'CashRegister', 'WalletTransaction'],
  },
  {
    id: 'expenses',
    label: 'Gastos y Punto de Equilibrio',
    description: 'Vacía la tabla de gastos (Expense).',
    entities: ['Expense'],
  },
  {
    id: 'adjustments',
    label: 'Ajustes de Inventario',
    description: 'Borra el historial de ajustes (InventoryAdjustment) sin afectar el inventario actual.',
    entities: ['InventoryAdjustment'],
  },
  {
    id: 'audits',
    label: 'Auditorías',
    description: 'Borra datos de auditorías y sus históricos (IceCreamAudit).',
    entities: ['IceCreamAudit'],
  },
];

const CONFIRMATION_PHRASE = 'BORRAR DEPARTAMENTOS';

export default function SelectiveCleanupCard() {
  const [selected, setSelected] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [running, setRunning] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedDepartments = DEPARTMENTS.filter(d => selected[d.id]);
  const hasSelection = selectedDepartments.length > 0;

  const openConfirm = () => {
    if (!hasSelection) return;
    setConfirmText('');
    setConfirmOpen(true);
  };

  const executeCleanup = async () => {
    if (confirmText.trim() !== CONFIRMATION_PHRASE) return;
    setRunning(true);
    const errors = [];
    let totalDeleted = 0;

    // Helper: delete con reintentos y backoff exponencial para evitar 429
    const deleteWithRetry = async (entity, id, entityName, maxRetries = 5) => {
      let attempt = 0;
      while (true) {
        try {
          await entity.delete(id);
          return true;
        } catch (e) {
          const status = e?.response?.status || e?.status;
          const isRateLimit = status === 429;
          if (isRateLimit && attempt < maxRetries) {
            // Backoff exponencial: 500ms, 1s, 2s, 4s, 8s
            const wait = 500 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, wait));
            attempt += 1;
            continue;
          }
          errors.push(`${entityName} (${id}): ${e.message || 'error'}`);
          return false;
        }
      }
    };

    // Procesa una entidad con concurrencia controlada (lotes pequeños)
    const purgeEntity = async (entityName) => {
      const entity = base44.entities[entityName];
      if (!entity) {
        errors.push(`${entityName}: entidad no encontrada`);
        return;
      }
      let records = [];
      try {
        records = await entity.list();
      } catch (e) {
        errors.push(`${entityName}: ${e.message || 'error de listado'}`);
        return;
      }

      const BATCH_SIZE = 4; // 4 borrados en paralelo
      const PAUSE_BETWEEN_BATCHES = 150; // ms

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(r => deleteWithRetry(entity, r.id, entityName))
        );
        totalDeleted += results.filter(Boolean).length;
        if (i + BATCH_SIZE < records.length) {
          await new Promise(r => setTimeout(r, PAUSE_BETWEEN_BATCHES));
        }
      }
    };

    try {
      const entitiesToPurge = Array.from(
        new Set(selectedDepartments.flatMap(d => d.entities))
      );

      // Procesar entidades secuencialmente (cada una con sus propios lotes)
      for (const entityName of entitiesToPurge) {
        await purgeEntity(entityName);
      }

      // Refrescar todas las queries para que la UI muestre estado vacío
      queryClient.invalidateQueries();

      if (errors.length === 0) {
        toast({
          title: 'Limpieza completada',
          description: `Se eliminaron ${totalDeleted} registros de ${entitiesToPurge.length} entidad(es).`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: `Limpieza con ${errors.length} error(es)`,
          description: `${totalDeleted} eliminados. Revisa la consola para más detalle.`,
        });
        console.error('Errores de limpieza selectiva:', errors);
      }

      setConfirmOpen(false);
      setSelected({});
      setConfirmText('');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-destructive">Limpieza Selectiva del Sistema</CardTitle>
              <CardDescription>
                Vacía los datos de departamentos específicos sin tocar billeteras, métodos de pago, categorías ni usuarios.
                Útil para pasar de modo prueba a producción.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2.5">
            {DEPARTMENTS.map(dep => (
              <label
                key={dep.id}
                htmlFor={`cleanup-${dep.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  id={`cleanup-${dep.id}`}
                  checked={!!selected[dep.id]}
                  onCheckedChange={() => toggle(dep.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{dep.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{dep.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {hasSelection
                ? `${selectedDepartments.length} departamento(s) seleccionado(s)`
                : 'Selecciona al menos un departamento para continuar'}
            </p>
            <Button
              variant="destructive"
              onClick={openConfirm}
              disabled={!hasSelection}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Ejecutar Limpieza Selectiva
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(o) => !running && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmación Crítica
            </DialogTitle>
            <DialogDescription>
              Esta acción es <strong>irreversible</strong>. Se eliminarán todos los registros de los departamentos listados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-2">Departamentos a purgar:</p>
              <ul className="space-y-1 text-sm">
                {selectedDepartments.map(dep => (
                  <li key={dep.id} className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>
                      <span className="font-medium">{dep.label}</span>
                      <span className="text-muted-foreground"> ({dep.entities.join(', ')})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1"><strong>Se mantendrán intactos:</strong></p>
              <p>Billeteras, métodos de pago, categorías personalizadas y usuarios administradores.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-phrase" className="text-sm">
                Para confirmar, escribe exactamente: <code className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono text-xs">{CONFIRMATION_PHRASE}</code>
              </Label>
              <Input
                id="confirm-phrase"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                disabled={running}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={running}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={executeCleanup}
              disabled={confirmText.trim() !== CONFIRMATION_PHRASE || running}
              className="gap-2"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {running ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}