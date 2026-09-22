import React from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Trash2, RotateCcw } from 'lucide-react';

/** Fila de conversación con acción de archivar (papelera) o restaurar. */
export default function ConversationRow({ conversation, isActive, archived, onSelect, onAction }) {
  const ActionIcon = archived ? RotateCcw : Trash2;

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
        isActive ? 'bg-secondary' : 'hover:bg-secondary/60'
      )}>
      <button
        onClick={() => onSelect(conversation.id)}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs',
          isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}>
        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{conversation.metadata?.name || 'Conversación'}</span>
      </button>
      <button
        onClick={() => onAction(conversation)}
        title={archived ? 'Restaurar conversación' : 'Archivar conversación'}
        className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100">
        <ActionIcon className="h-3.5 w-3.5" />
      </button>
    </div>);

}