import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCustomerHistory } from '@/lib/customerHistory';
import { useShopSetting } from '@/lib/useShopSetting';
import { LOYALTY_KEY, parseRules, computeLoyalty } from '@/lib/loyalty';

export default function LoyaltyBenefitAlert({ customer }) {
  const [informed, setInformed] = useState(false);
  const { value, isLoading } = useShopSetting(LOYALTY_KEY);
  const { data } = useQuery({
    queryKey: ['customer_history', customer.id],
    queryFn: () => getCustomerHistory(customer),
  });
  if (isLoading || !data) return null;
  const l = computeLoyalty(data.entries, parseRules(value));
  if (l.unlockedLevels < 1) return null;

  if (informed) {
    return <p className="mt-2 text-xs text-emerald-700">✓ Cliente informado de su beneficio de fidelidad</p>;
  }
  return (
    <div className="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <Gift className="h-8 w-8 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-amber-900">¡{customer.full_name} tiene un beneficio de fidelidad!</p>
        <p className="text-sm text-amber-800">
          {l.unlockedLevels} beneficio(s) liberado(s) · {l.paidPoints} puntos pagados. Infórmale al cliente y aplícalo si lo desea.
        </p>
      </div>
      <Button size="sm" onClick={() => setInformed(true)}>Cliente informado</Button>
    </div>
  );
}