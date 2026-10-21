import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Coins, Loader2 } from 'lucide-react';

const USD_ACCOUNT = /(caja efectivo \$|binance)/i;
const BS_ACCOUNT = /(cuenta a|cuenta b|bs caja efectivo|caja efectivo bs)/i;

async function getRate() {
  const s = await base44.entities.ShopSetting.filter({ key: { $in: ['use_manual_rate', 'manual_rate_eur_ves', 'exchange_rate_eur_ves'] } });
  const g = (k) => s.find((x) => x.key === k)?.value;
  return Number(g('use_manual_rate') === 'true' ? g('manual_rate_eur_ves') : g('exchange_rate_eur_ves'));
}

async function analyze() {
  const rate = await getRate();
  const rows = await base44.entities.Expense.filter(
    { date: { $gte: '2026-09-01', $lte: '2026-10-31' }, notes: { $regex: 'Hoja:' } }, '-date', 2000);
  const updates = []; let review = 0;
  for (const e of rows) {
    const cuenta = (e.notes.match(/Cuenta: ([^|]*)/)?.[1] || '').trim();
    const orig = Number(e.notes.match(/Original: ([\d.]+)/)?.[1]);
    const head = e.notes.split(/\| Original:/)[0];
    const tail = e.notes.match(/\| (Hoja: .*)$/)?.[1] || '';
    let amount; let trail;
    if (!orig) { review++; continue; }
    if (USD_ACCOUNT.test(cuenta)) { amount = orig; trail = `Original: ${orig} USD`; }
    else if (BS_ACCOUNT.test(cuenta) && rate > 0) { amount = Math.round((orig / rate) * 100) / 100; trail = `Original: ${orig} Bs | Tasa Euro BCV app: ${rate}`; }
    else { review++; continue; }
    const notes = `${head.trim()} | ${trail} | ${tail}`;
    if (amount !== e.amount || notes !== e.notes) updates.push({ id: e.id, amount, notes });
  }
  return { updates, review, total: rows.length, rate };
}

export default function FixCurrencyHistoryButton() {
  const qc = useQueryClient();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = async () => { setBusy(true); setPlan(await analyze()); setBusy(false); };
  const confirm = async () => {
    setBusy(true);
    for (let i = 0; i < plan.updates.length; i += 200) await base44.entities.Expense.bulkUpdate(plan.updates.slice(i, i + 200));
    await qc.invalidateQueries({ queryKey: ['expenses'] });
    setBusy(false); setPlan(null);
  };

  return (
    <>
      <Button variant="outline" onClick={open} disabled={busy}>
        {busy && !plan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Coins className="h-4 w-4 mr-2" />}
        Corregir monedas sep–oct
      </Button>
      <AlertDialog open={!!plan} onOpenChange={(o) => !o && !busy && setPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Corregir monedas del historial</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Gastos importados de Google Sheets (sep–oct): <b>{plan?.total}</b></p>
                <p>Se corregirán: <b>{plan?.updates.length}</b> · Requieren revisión manual: <b>{plan?.review}</b></p>
                <p className="text-xs">Cuentas A, B y Caja efectivo Bs se convierten con la tasa Euro BCV de la app ({plan?.rate || '—'}). Caja efectivo $ y Binance se quedan sin conversión.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            {plan?.updates.length > 0 && (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); confirm(); }} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Corregir ${plan.updates.length}`}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}