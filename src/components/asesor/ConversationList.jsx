import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Plus } from 'lucide-react';

export default function ConversationList({ conversations, activeId, onSelect, onNew }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full justify-start" size="sm" onClick={onNew}>
          <Plus className="h-4 w-4" /> Nueva conversación
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {conversations.length === 0 &&
        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Aún no tienes conversaciones.
          </p>
        }
        {conversations.map((c) =>
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
            c.id === activeId ?
            'bg-secondary font-semibold text-foreground' :
            'text-muted-foreground hover:bg-secondary/60'
          )}>
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{c.metadata?.name || 'Conversación'}</span>
          </button>
        )}
      </div>
    </div>);

}