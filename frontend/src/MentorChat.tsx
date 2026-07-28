import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Plus, RefreshCw, Send, User } from 'lucide-react';
import type { ChatMessage, ChatSession } from './backend';
import { Button } from './UI';
import { cn } from './utils';
import { KAVYA_CHAT } from './prototypeData';
import { VINEET_CHAT, VINEET_PROFILE } from './vineetData';
import { useSession } from './session';

type LocalMessage = Pick<ChatMessage, 'id' | 'role' | 'content' | 'created_at'>;

const RESUME_PROMPTS = [
  'Review my resume for recruiters',
  'What should I improve before applying?',
  'Make my project bullets stronger',
  'What keywords am I missing?',
];

export function MentorChat({ className }: { className?: string }) {
  const session = useSession();
  const isVineet = session.user?.id === VINEET_PROFILE.id;
  const protoChat = isVineet ? VINEET_CHAT : KAVYA_CHAT;
  const prototypeMessages: LocalMessage[] = useMemo(() => protoChat.map((message, index) => ({
    id: `proto-${index}`,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    created_at: new Date().toISOString(),
  })), [protoChat]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>('proto-session');
  const [messages, setMessages] = useState<LocalMessage[]>(prototypeMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { data: sessions, loading, error, reload } = {
    data: [{ id: 'proto-session', user_id: session.user?.id ?? 'local-user', title: 'Resume mentor chat', context_type: 'resume', created_at: new Date().toISOString(), last_message_at: new Date().toISOString() }] as ChatSession[],
    loading: false,
    error: null,
    reload: () => {},
  };

  useEffect(() => {
    if (!activeSessionId && sessions?.length) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setActiveSessionId('proto-session');
    setMessages(prototypeMessages);
  }, [prototypeMessages]);

  async function createSession() {
    setActiveSessionId('proto-session');
    setMessages(prototypeMessages);
    reload();
  }

  async function sendMessage(nextMessage = input) {
    const text = nextMessage.trim();
    if (!text || streaming) return;

    const userMessage: LocalMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    const assistantId = `assistant-${Date.now()}`;

    setInput('');
    setStreaming(true);
    setMessages((items) => [...items, userMessage]);
    window.setTimeout(() => {
      const content = "Great question! Focus on closing your Docker and System Design gaps this week. Apply to Razorpay - your 94% fit score is the highest match in your list. Your ZeroGap project is your strongest proof.";
      setMessages((items) => [
        ...items,
        { id: assistantId, role: 'assistant', content, created_at: new Date().toISOString() },
      ]);
      setStreaming(false);
    }, 800);
  }

  return (
    <section className={cn('slab-card !rounded-[2rem] !p-0 overflow-hidden flex min-h-[560px] flex-col', className)}>
      <div className="flex items-center justify-between gap-4 border-b-2 border-slate-900 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Bot size={20} />
          </div>
          <div>
            <p className="font-black uppercase tracking-tight">Resume Mentor</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-success">{streaming ? 'Streaming now' : 'Ready'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reload} className="text-slate-400 hover:text-primary">
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={() => void createSession()} className="text-slate-400 hover:text-primary">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/70 p-5">
        {loading && <p className="text-xs font-black uppercase text-slate-400">Loading mentor...</p>}
        {error && <p className="text-xs font-black uppercase text-danger">{error}</p>}
        {!messages.length && (
          <div className="flex min-h-[330px] items-center justify-center text-center">
            <div className="max-w-xl">
              <Bot className="mx-auto mb-4 text-slate-300" size={46} />
              <h2 className="mb-3 text-3xl font-display font-black uppercase italic">Ask about your resume.</h2>
              <p className="mx-auto mb-6 max-w-md text-sm font-medium text-slate-500">
                Get focused advice on resume bullets, ATS keywords, projects, and recruiter readiness.
              </p>
              <div className="grid gap-2 text-left sm:grid-cols-2">
                {RESUME_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold transition-all hover:border-slate-900 hover:bg-secondary/20"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="space-y-5">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-900', message.role === 'user' ? 'bg-secondary' : 'bg-primary text-white')}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn('max-w-[82%] whitespace-pre-wrap rounded-2xl border-2 border-slate-900 px-4 py-3 text-sm font-medium leading-relaxed', message.role === 'user' ? 'bg-secondary/40' : 'bg-white')}>
                {message.content || '...'}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex items-center gap-2 px-4 py-3">
              <Bot size={16} className="shrink-0 text-primary" />
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t-2 border-slate-900 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask about your resume..."
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 py-3 text-sm font-bold outline-none"
          />
          <Button onClick={() => void sendMessage()} disabled={!input.trim() || streaming} className="self-end">
            <Send size={16} /> SEND
          </Button>
        </div>
      </div>
    </section>
  );
}
