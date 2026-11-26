import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ScanSearch } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { getStockTotal } from '@/lib/stockHelpers';
import { useRole } from '@/lib/useRole';
import { isResidual, fmtQty, notifyAudit } from '@/lib/inventoryAudit';
import { useAuditCorrections } from '@/components/auditor/useAuditCorrections';

// Vigila el inventario tras ventas/producciones: si un insumo baja y queda
// dentro de su umbral residual, avisa sin bloquear (solo admin/gerente).
export default function ResidualWatcher() {
  const { isAdmin, isGerente } = useRole();
  const canManage = isAdmin || isGerente;
  const { data: supplies } = useQuery({ queryKey: ['supplies'], queryFn: () => base44.entities.Supply.list() });
  const prev = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const { confirmZero } = useAuditCorrections();

  useEffect(() => { notifyAudit(); }, []);

  useEffect(() => {
    if (!supplies) return;
    const map = new Map(supplies.map(s => [s.id, getStockTotal(s)]));
    if (prev.current) {
      const hits = supplies.filter(s => {
        const before = prev.current.get(s.id);
        const now = map.get(s.id);
        return before != null && now < before - 1e-6 && isResidual(s, now);
      });
      if (hits.length) {
        notifyAudit(true);
        setAlerts(a => [...a.filter(x => !hits.some(h => h.id === x.id)), ...hits.map(s => ({ id: s.id, name: s.name, unit: s.unit, stock: map.get(s.id) }))].slice(-3));
      }
    }
    prev.current = map;
  }, [supplies]);

  if (!canManage) return null;
  const dismiss = (id) => setAlerts(a => a.filter(x => x.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {alerts.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="rounded-xl border border-amber-300 bg-card p-3.5 shadow-lg">
            <p className="flex gap-2 text-sm">
              <ScanSearch className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span><span className="font-semibold">Auditor:</span> {a.name} quedó con {fmtQty(a.stock)} {a.unit} (posible residual de empaque). ¿Se acabó?</span>
            </p>
            <div className="mt-2.5 flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismiss(a.id)}>Ignorar</Button>
              <Button size="sm" className="h-7 text-xs" disabled={confirmZero.isPending}
                onClick={() => confirmZero.mutate({ supply_id: a.id, finding_key: `residual:${a.id}` }, { onSuccess: () => dismiss(a.id) })}>
                Confirmar agotado (0 {a.unit})
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}