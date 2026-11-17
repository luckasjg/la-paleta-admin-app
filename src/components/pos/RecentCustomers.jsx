import React from 'react';
import { History } from 'lucide-react';
import { getRecentCustomers } from '@/lib/recentCustomers';

export default function RecentCustomers({ sessionId, onPick }) {
  const list = getRecentCustomers(sessionId);
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" /> Clientes Recientes
      </p>
      <div className="grid grid-cols-2 gap-2">
        {list.map(c => (
          <button key={c.id} type="button" onClick={() => onPick(c)}
            className="text-left rounded-lg border px-3 py-2 hover:bg-accent hover:border-primary/40 transition-colors">
            <p className="text-sm font-medium truncate">{c.full_name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">V-{c.cedula}</p>
          </button>
        ))}
      </div>
    </div>
  );
}