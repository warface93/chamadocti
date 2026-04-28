import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import iarpeImg from '@/assets/iarpe-logo.png';

type Msg = { role: 'user' | 'assistant'; content: string };
type AnimState = 'idle' | 'typing' | 'explaining' | 'alert';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iarpe-chat`;

const IArpeAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animState, setAnimState] = useState<AnimState>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Olá! 👋 Eu sou o **IArpe**, seu assistente virtual do CTIChamados! Como posso te ajudar hoje?'
      }]);
    }
  }, [open, messages.length]);

  const getViewport = () => {
    const root = scrollRef.current as any;
    if (!root) return null;
    return root.querySelector?.('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
  };

  const scrollToBottom = useCallback(() => {
    const v = getViewport();
    if (v) {
      v.scrollTop = v.scrollHeight;
      setHasNewMessages(false);
      setAutoScroll(true);
    }
  }, []);

  useEffect(() => {
    const v = getViewport();
    if (!v) return;
    const onScroll = () => {
      const nearBottom = v.scrollHeight - v.scrollTop - v.clientHeight < 40;
      setAutoScroll(nearBottom);
      if (nearBottom) setHasNewMessages(false);
    };
    v.addEventListener('scroll', onScroll);
    return () => v.removeEventListener('scroll', onScroll);
  }, [open]);

  useEffect(() => {
    if (autoScroll) {
      const v = getViewport();
      if (v) v.scrollTop = v.scrollHeight;
    } else {
      if (messages[messages.length - 1]?.role === 'assistant') {
        setHasNewMessages(true);
      }
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);
    setAnimState('typing');

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error('Falha na conexão');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      setAnimState('explaining');

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && prev.length > allMessages.length) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('IArpe error:', e);
      setAnimState('alert');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😅 Desculpe, tive um probleminha. Pode tentar novamente?'
      }]);
      setTimeout(() => setAnimState('idle'), 2000);
    } finally {
      setIsLoading(false);
      setTimeout(() => setAnimState('idle'), 1500);
    }
  }, [input, isLoading, messages]);

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Abrir assistente IArpe"
        >
          <div className="relative">
            <div className={`w-16 h-16 rounded-full bg-primary shadow-lg flex items-center justify-center overflow-hidden border-2 border-primary-foreground/20 transition-transform duration-300 group-hover:scale-110 ${animState === 'idle' ? 'animate-bounce-slow' : ''}`}>
              <img
                src={iarpeImg}
                alt="IArpe"
                className={`w-14 h-14 object-contain ${animState === 'typing' ? 'iarpe-typing' : ''}`}
              />
            </div>
            {/* Blinking eyes overlay */}
            <div className="absolute inset-0 pointer-events-none iarpe-blink" />
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
          </div>
          <span className="absolute -top-8 right-0 bg-card text-card-foreground text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Precisa de ajuda? 💬
          </span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-2xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-primary text-primary-foreground">
            <div className="relative w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
              <img
                src={iarpeImg}
                alt="IArpe"
                className={`w-9 h-9 object-contain ${animState === 'typing' ? 'iarpe-typing' : animState === 'explaining' ? 'iarpe-explaining' : animState === 'alert' ? 'iarpe-alert' : ''}`}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm">IArpe</h3>
              <p className="text-xs opacity-80">
                {animState === 'typing' ? 'Digitando...' : animState === 'explaining' ? 'Respondendo...' : 'Assistente Virtual'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <img src={iarpeImg} alt="" className="w-5 h-5 object-contain" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
                    <img src={iarpeImg} alt="" className="w-5 h-5 object-contain iarpe-typing" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida..."
                className="flex-1 text-sm rounded-full"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="rounded-full h-9 w-9 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default IArpeAssistant;
