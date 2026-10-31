import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { getCustomerHistory } from '@/lib/customerHistory';
import { useShopSetting } from '@/lib/useShopSetting';
import { getActiveSession } from '@/lib/cashSession';
import { LOYALTY_KEY, parseRules, computeLoyalty } from '@/lib/loyalty';

export default function LoyaltyBenefitAlert({ customer }) {
  const [informed, setInformed] = useState(false);
  const qc = useQueryClient();
  const { value, isLoading } = useShopSetting(LOYALTY_KEY);
  const { data } = useQuery({
    queryKey: ['customer_history', customer.id],
    queryFn: () => getCustomerHistory(customer),
  });
  const { data: redeemed } = useQuery({
    queryKey: ['loyalty_redemptions', customer.id],
    queryFn: () => base44.entities.LoyaltyRedemption.count({ customer_id: customer.id }),
  });
  const redeem = useMutation({
    mutationFn: (level) => {
      const s = getActiveSession();
      return base44.entities.LoyaltyRedemption.create({
        customer_id: customer.id, customer_name: customer.full_name, level,
        redeemed_at: new Date().toISOString(), staff_name: s?.staff_name || '', cash_register_id: s?.id || '',
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loyalty_redemptions', customer.id] }); toast.success('Beneficio canjeado'); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data || redeemed === undefined) return null;
  const l = computeLoyalty(data.entries, parseRules(value));
  const available = l.unlockedLevels - redeemed;
  if (available < 1) return null;

  return (
    <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <Gift className="h-8 w-8 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-amber-900">¡{customer.full_name} tiene un beneficio de fidelidad!</p>
        <p className="text-sm text-amber-800">
          {available} beneficio(s) disponible(s) · {l.paidPoints} puntos pagados.
          {informed ? ' ✓ Cliente informado.' : ' Infórmale al cliente.'}
        </p>
      </div>
      <div className="flex gap-2">
        {!informed && <Button size="sm" variant="outline" onClick={() => setInformed(true)}>Cliente informado</Button>}
        <Button size="sm" disabled={redeem.isPending} onClick={() => redeem.mutate(redeemed + 1)}>
          {redeem.isPending ? 'Guardando…' : 'Registrar canje'}
        </Button>
      </div>
    </div>
  );
}