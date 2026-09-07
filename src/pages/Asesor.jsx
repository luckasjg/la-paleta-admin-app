import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles } from 'lucide-react';
import MessageBubble from '@/components/asesor/MessageBubble';
import ConversationList from '@/components/asesor/ConversationList';
import TelegramConnectCard from '@/components/asesor/TelegramConnectCard';

const AGENT = 'asesor';

const SUGGESTIONS = [
'¿Cómo van las ventas de hoy?',
'¿Qué insumos están por agotarse?',
'¿Cuál es mi margen del último mes?',
'¿Cuánto tengo en cada billetera?'];


export default function Asesor() {
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = async () => {
    const list = await base44.agents.listConversations({ agent_name: AGENT });
    setConversations(list || []);
    return list || [];
  };

  useEffect(() => {loadConversations();}, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (id) => {
    const conv = await base44.agents.getConversation(id);
    setConversation(conv);
    setMessages(conv.messages || []);
  };

  const startNew = () => {
    setConversation(null);
    setMessages([]);
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT,
          metadata: { name: content.slice(0, 40), description: 'Consulta al asesor' }
        });
        setConversation(conv);
        loadConversations();
      }
      setMessages((prev) => [...prev, { role: 'user', content }]);
      await base44.agents.addMessage(conv, { role: 'user', content });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Historial */}
      <aside className="hidden w-64 flex-shrink-0 flex-col rounded-2xl border border-border bg-card lg:flex">
        <ConversationList
          conversations={conversations}
          activeId={conversation?.id}
          onSelect={openConversation}
          onNew={startNew} />

        <div className="border-t border-border">
          <TelegramConnectCard />
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">La Paleta Asesor</h1>
            <p className="text-xs text-muted-foreground">Análisis con tus datos reales · las propuestas las apruebas tú</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto lg:hidden" onClick={startNew}>
            Nueva
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {messages.length === 0 ?
          <div className="mx-auto max-w-md pt-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">¿En qué te ayudo hoy?</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Pregúntame sobre ventas, caja, gastos, inventario o rentabilidad.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) =>
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {s}
                  </button>
              )}
              </div>
            </div> :

          messages.map((m, i) => <MessageBubble key={i} message={m} />)
          }
        </div>

        <footer className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escribe tu pregunta…"
              rows={1}
              className="max-h-40 min-h-[42px] resize-none rounded-xl" />

            <Button size="icon" className="h-[42px] w-[42px] rounded-xl" onClick={() => send()} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            El asesor solo lee tus datos. Ningún cambio se aplica sin tu aprobación.
          </p>
        </footer>
      </section>
    </div>);

}