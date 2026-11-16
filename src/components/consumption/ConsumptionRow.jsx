import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import MovementsTable from '@/components/production/audit/MovementsTable';

const n = (v) => (Number(v) || 0).toLocaleString('es-VE', { maximumFractionDigits: 1 });

export default function ConsumptionRow({ group }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr onClick={() => setOpen(o => !o)} className="cursor-pointer hover:bg-muted/40 transition-colors">
        <td className="py-2.5 px-3 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
            {group.name}
          </span>
        </td>
        <td className="py-2.5 px-3 text-muted-foreground">{group.category}</td>
        <td className="py-2.5 px-3 text-right font-mono">{n(group.quantity)} {group.unit}</td>
        <td className="py-2.5 px-3 text-right font-mono">${group.cost.toFixed(2)}</td>
        <td className="py-2.5 px-3 text-right font-mono">{group.uses}</td>
        <td className="py-2.5 px-3 text-right font-mono">{group.stock == null ? '—' : `${n(group.stock)} ${group.unit}`}</td>
      </tr>
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-6 py-2"><MovementsTable movements={group.movements} showOrigin /></td>
        </tr>
      )}
    </>
  );
}