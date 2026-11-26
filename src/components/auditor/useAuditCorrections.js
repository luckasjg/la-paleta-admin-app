import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { auditAction } from '@/lib/inventoryAudit';

export function useAuditCorrections() {
  const qc = useQueryClient();
  const refresh = () => ['inventory_audit', 'supplies', 'adjustments', 'inventory_adjustments'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const onError = (e) => toast.error(e.response?.data?.error || e.message);

  const confirmZero = useMutation({
    mutationFn: ({ supply_id, finding_key }) => auditAction({ action: 'correct', mode: 'zero', supply_id, finding_key }),
    onSuccess: () => { refresh(); toast.success('Insumo confirmado como agotado (0)'); },
    onError,
  });
  const adjust = useMutation({
    mutationFn: (p) => auditAction({ action: 'correct', mode: 'physical', ...p }),
    onSuccess: () => { refresh(); toast.success('Stock físico ajustado y registrado'); },
    onError,
  });
  const silence = useMutation({
    mutationFn: ({ supply_id }) => auditAction({ action: 'silence', supply_id, value: true }),
    onSuccess: () => { refresh(); toast.success('Alertas de sobreexistencia silenciadas para este insumo'); },
    onError,
  });
  return { confirmZero, adjust, silence };
}