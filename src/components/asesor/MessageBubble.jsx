import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { IceCream } from 'lucide-react';
import ToolCallChip from '@/components/asesor/ToolCallChip';
import ProposalCard from '@/components/asesor/ProposalCard';
import { parseProposals } from '@/lib/asesorProposals';
import { parseDataBlocks } from '@/lib/asesorDataBlocks';
import DataBlockCard from '@/components/asesor/DataBlockCard';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const { text: withoutProposals, proposals } = isUser ?
  { text: message.content, proposals: [] } :
  parseProposals(message.content);
  const { text, blocks } = isUser ?
  { text: withoutProposals, blocks: [] } :
  parseDataBlocks(withoutProposals);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>);

  }

  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
        <IceCream className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[85%] min-w-0">
        {text &&
        <div className={cn(
          'rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm',
          'prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-1.5 prose-headings:text-sm prose-hr:my-3 prose-table:text-xs'
        )}>
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        }
        {blocks.map((b, i) => <DataBlockCard key={i} block={b} />)}
        {message.tool_calls?.map((tc, i) => <ToolCallChip key={i} toolCall={tc} />)}
        {proposals.map((p, i) => <ProposalCard key={i} proposal={p} />)}
      </div>
    </div>);

}