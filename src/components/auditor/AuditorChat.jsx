import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { auditAction } from '@/lib/inventoryAudit';

const SUGGESTIONS = [
  '¿Qué productos se están vendiendo sin descontar inventario?',
  '¿Qué insumos tienen sobreexistencia sospechosa?',
  '¿Qué insumos debería contar físicamente hoy?',
];

export default function AuditorChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const history = messages;
    setMessages(m => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await auditAction({ action: 'ask', question: q, history });
      setMessages(m => [...m, { role: 'assistant', content: res.answer }]);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
      setMessages(m => m.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="py-6 space-y-3">
            <div className="text-center space-y-1">
              <Sparkles className="h-7 w-7 mx-auto text-primary" />
              <p className="text-sm font-medium">Consulta al Auditor</p>
              <p className="text-xs text-muted-foreground">Responde con los datos reales del inventario. No modifica nada.</p>
            </div>
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" onClick={() => send(s)}
                className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-muted/60 transition-colors">{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.role === 'user' ? m.content : (
                <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:pl-4 [&_ol]:list-decimal [&_p]:my-1.5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">El Auditor está revisando los datos…</div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-3 border-t border-border mt-3">
        <Textarea rows={1} value={input} onChange={e => setInput(e.target.value)} maxLength={1000}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Pregunta sobre el inventario…" className="min-h-[40px] resize-none" />
        <Button size="icon" className="h-10 w-10 shrink-0" disabled={!input.trim() || loading} onClick={() => send()}>
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}