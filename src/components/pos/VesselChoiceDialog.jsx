import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coffee, GlassWater } from 'lucide-react';

const OPTIONS = [
  { value: 'taza', label: 'Taza', Icon: Coffee, hint: ['Cerámica', '(no descuenta vaso)'] },
  { value: 'vaso', label: 'Vaso', Icon: GlassWater, hint: ['Desechable', '(descuenta del stock)'] },
];

// Diálogo para elegir Taza (cerámica) vs Vaso (desechable).
export default function VesselChoiceDialog({ product, onChoose, onClose }) {
  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            ¿Cómo se sirve? — {product?.name}
            <p className="text-sm font-normal text-muted-foreground mt-0.5">Elige el recipiente para esta orden</p>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {OPTIONS.map(({ value, label, Icon, hint }) => (
            <button key={value} type="button" onClick={() => onChoose(value)}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all active:scale-95">
              <Icon className="h-10 w-10 text-primary" />
              <span className="font-semibold">{label}</span>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">{hint[0]}<br />{hint[1]}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}