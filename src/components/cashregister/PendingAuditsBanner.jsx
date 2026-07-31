import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import moment from 'moment';

const SHIFT_LABEL = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

export default function PendingAuditsBanner({ pending = [], selectedId, onSelect }) {
  if (pending.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
        <AlertTriangle className="h-4 w-4" />
        {pending.length} sesión(es) de caja cerrada(s) sin auditoría de helados
      </div>
      <p className="text-xs text-amber-800">
        No se podrá abrir una nueva caja hasta completar estas auditorías. El consumo
        teórico se calcula con las ventas de cada sesión, sin importar cuánto tiempo pase.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {pending.map(r => (
          <Button
            key={r.id}
            size="sm"
            variant={selectedId === r.id ? 'default' : 'outline'}
            onClick={() => onSelect(selectedId === r.id ? null : r)}
          >
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
            {moment(r.date).format('DD/MM')} · {SHIFT_LABEL[r.shift] || r.shift} · {r.staff_name || r.operator || '—'}
          </Button>
        ))}
      </div>
    </div>
  );
}