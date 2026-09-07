import React, { useState } from 'react';
import { ChevronRight, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const RUNNING = ['pending', 'running', 'in_progress'];

function parseResults(results) {
  if (!results) return null;
  if (typeof results !== 'string') return results;
  try {return JSON.parse(results);} catch {return results;}
}

export default function ToolCallChip({ toolCall }) {
  const [open, setOpen] = useState(false);
  const parsed = parseResults(toolCall.results);
  const isRunning = RUNNING.includes(toolCall.status);
  const failed =
    ['failed', 'error'].includes(toolCall.status) ||
    (typeof toolCall.results === 'string' && /error|failed/i.test(toolCall.results)) ||
    parsed?.success === false;

  const proj = toolCall.display_projection || {};
  const hidden = proj.hide_details && proj.details_redacted;
  const label = isRunning ?
    proj.active_label || 'Consultando datos…' :
    failed ?
    proj.error_label || 'No se pudo consultar' :
    proj.label || `Consultó ${String(toolCall.name || '').replace(/_/g, ' ')}`;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => !hidden && setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
          failed ?
          'border-destructive/30 bg-destructive/10 text-destructive' :
          'border-border bg-secondary/60 text-muted-foreground hover:bg-secondary'
        )}>
        {isRunning ?
        <Loader2 className="h-3 w-3 animate-spin" /> :
        failed ?
        <AlertCircle className="h-3 w-3" /> :
        <Check className="h-3 w-3" />}
        <span>{label}</span>
        {!hidden &&
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />}
      </button>

      {open && !hidden &&
      <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-[11px]">
          {toolCall.arguments_string &&
        <div>
              <p className="mb-1 font-semibold text-foreground">Parámetros</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                {(() => {try {return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);} catch {return toolCall.arguments_string;}})()}
              </pre>
            </div>
        }
          {parsed &&
        <div>
              <p className="mb-1 font-semibold text-foreground">Resultado</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-muted-foreground">
                {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
        }
        </div>
      }
    </div>);

}