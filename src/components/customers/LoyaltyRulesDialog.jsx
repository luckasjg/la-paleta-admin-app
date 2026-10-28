import React, { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useShopSetting } from '@/lib/useShopSetting';
import { LOYALTY_KEY, parseRules } from '@/lib/loyalty';

export default function LoyaltyRulesDialog() {
  const { value, save } = useShopSetting(LOYALTY_KEY);
  const [open, setOpen] = useState(false);
  const [r, setR] = useState(parseRules(''));
  useEffect(() => { if (open) setR(parseRules(value)); }, [open, value]);

  const submit = async () => {
    await save(JSON.stringify({ points_per_eur: Number(r.points_per_eur) || 0, min_visit_eur: Number(r.min_visit_eur) || 0 }));
    setOpen(false);
  };

  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Settings2 className="h-4 w-4" /> Reglas de fidelidad</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reglas de fidelidad</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Puntos por cada € gastado</Label><Input type="number" min="0" step="0.1" value={r.points_per_eur} onChange={e => setR({ ...r, points_per_eur: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Compra mínima para contar visita (€)</Label><Input type="number" min="0" step="0.5" value={r.min_visit_eur} onChange={e => setR({ ...r, min_visit_eur: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Guardar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}