import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Archive, ArrowLeft } from 'lucide-react';
import ConversationRow from '@/components/asesor/ConversationRow';

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onArchive,
  onRestore
}) {
  const [showArchived, setShowArchived] = useState(false);

  const active = conversations.filter((c) => !c.metadata?.archived);
  const archived = conversations.filter((c) => c.metadata?.archived);
  const list = showArchived ? archived : active;

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        {showArchived ?
        <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setShowArchived(false)}>
            <ArrowLeft className="h-4 w-4" /> Volver a mis chats
          </Button> :

        <Button className="w-full justify-start" size="sm" onClick={onNew}>
            <Plus className="h-4 w-4" /> Nueva conversación
          </Button>
        }
      </div>

      {showArchived &&
      <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Archivados
        </p>
      }

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {list.length === 0 &&
        <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {showArchived ? 'No tienes conversaciones archivadas.' : 'Aún no tienes conversaciones.'}
          </p>
        }
        {list.map((c) =>
        <ConversationRow
          key={c.id}
          conversation={c}
          isActive={c.id === activeId}
          archived={showArchived}
          onSelect={onSelect}
          onAction={showArchived ? onRestore : onArchive} />
        )}
      </div>

      {!showArchived && archived.length > 0 &&
      <button
        onClick={() => setShowArchived(true)}
        className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Archive className="h-3.5 w-3.5" />
          Archivados ({archived.length})
        </button>
      }
    </div>);

}