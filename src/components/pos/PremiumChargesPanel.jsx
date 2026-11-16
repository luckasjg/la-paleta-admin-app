import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MixedPaymentDialog from '@/components/pos/MixedPaymentDialog';
import PremiumChargeCard from '@/components/pos/PremiumChargeCard';
import { payPremiumCharge, chargeLabel, groupChargesBySale } from '@/lib/premiumCharge';

export default function PremiumChargesPanel({ session, wallets, eurVes }) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(null);

  const { data: rawCharges = [] } = useQuery({
    queryKey: ['premium_charges', 'pendiente'],
    queryFn: async () => (await base44.entities.PremiumSurchargeCharge.filter({ status: 'pendiente' }, { sort: 'created_date', limit: 30 })).items,
    refetchInterval: 5000,
  });

  const charges = groupChargesBySale(rawCharges);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['premium_charges'] });
    qc.invalidateQueries({ queryKey: ['sales'] });
    qc.invalidateQueries({ queryKey: ['wallets'] });
  };

  const pay = useMutation({
    mutationFn: (data) => payPremiumCharge({ charge: paying, session, wallets, ...data }),
    onSuccess: () => { toast.success(`Recargo cobrado · ${chargeLabel(paying)}`); setPaying(null); refresh(); },
    onError: (e) => toast.error(e.message),
  });

  const skip = useMutation({
    mutationFn: async (g) => {
      for (const c of g.charges) {
        await base44.entities.PremiumSurchargeCharge.update(c.id, {
          status: 'anulado', resolved_at: new Date().toISOString(), resolved_by: session.staff_name,
        });
      }
    },
    onSuccess: () => { toast.success('Recargo omitido'); refresh(); },
  });

  if (charges.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Recargos premium por cobrar ({charges.length})</p>
      {charges.map((c) => (
        <PremiumChargeCard key={c.id} charge={c} eurVes={eurVes} onPay={setPaying} onSkip={(x) => skip.mutate(x)} />
      ))}
      <MixedPaymentDialog
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        totalUSD={paying?.amount_usd || 0}
        eurVes={eurVes}
        wallets={wallets}
        isProcessing={pay.isPending}
        onConfirm={(data) => pay.mutate(data)}
      />
    </div>
  );
}