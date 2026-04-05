import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiCoachApi, ChatMessage } from '../lib/api/aiCoach';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { FormattedCoachMessage } from './ui/FormattedCoachMessage';

const QUICK_ACTIONS = [
    'Where am I weak?',
    'How can I improve my score?',
    'What should I study next?',
    'Show my progress',
];

function MessageBubble({ msg, onAction }: { msg: ChatMessage; onAction: (url: string) => void }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && (
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <Bot className="h-4 w-4 text-white" />
                </div>
            )}
            <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser
                    ? 'rounded-tr-sm bg-blue-600 text-white'
                    : 'rounded-tl-sm bg-slate-100 text-slate-800'
                    }`}
            >
                {isUser ? msg.content : <FormattedCoachMessage text={msg.content} />}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                        {msg.actions.map((action, idx) => (
                            <button
                                key={`${action.url}-${idx}`}
                                onClick={() => onAction(action.url)}
                                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-left text-blue-700 transition-colors hover:bg-blue-100"
                            >
                                <p className="text-[11px] font-bold">{action.label}</p>
                                {action.description && (
                                    <p className="mt-0.5 text-[10px] text-blue-600">{action.description}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AICoachChat() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasOpened, setHasOpened] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
            aiCoachApi.chat(message, history),
        onSuccess: (data) => {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.reply, actions: data.actions || [] },
            ]);
        },
        onError: () => {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        },
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            if (!hasOpened) {
                setHasOpened(true);
                setMessages([
                    {
                        role: 'assistant',
                        content: "Hi! I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
                    },
                ]);
            }
        }
    }, [open, hasOpened]);

    const sendMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || mutation.isPending) return;

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        mutation.mutate({
            message: trimmed,
            history: messages,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const showQuickActions = messages.length <= 1 && !mutation.isPending;
    const handleAction = (url: string) => {
        if (!url) return;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(url);
    };

    return (
        <>
            {open && (
                <div className="fixed bottom-20 right-4 z-50 flex max-h-[560px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
                    <div className="flex items-center justify-between bg-blue-600 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">AI Learning Coach</p>
                                <p className="text-[10px] text-blue-200">Powered by AI · Based on your test history</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/20"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '380px' }}>
                        {messages.map((msg, i) => (
                            <MessageBubble key={i} msg={msg} onAction={handleAction} />
                        ))}

                        {mutation.isPending && (
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                    <span className="ml-1 text-xs text-slate-400">Thinking...</span>
                                </div>
                            </div>
                        )}

                        {showQuickActions && (
                            <div className="space-y-1.5 pt-2">
                                <p className="px-1 text-[11px] font-medium text-slate-400">Quick questions:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_ACTIONS.map((action) => (
                                        <button
                                            key={action}
                                            onClick={() => sendMessage(action)}
                                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything about your performance..."
                            disabled={mutation.isPending}
                            className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || mutation.isPending}
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Send className="h-4 w-4 text-white" />
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={() => setOpen((prev) => !prev)}
                className="fixed bottom-4 right-4 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/40 transition-all duration-200 hover:scale-105 hover:bg-blue-700 active:scale-95"
                style={{ height: '52px', width: '52px' }}
                title="AI Learning Coach"
            >
                {open ? (
                    <ChevronDown className="h-5 w-5 text-white" />
                ) : (
                    <Bot className="h-6 w-6 text-white" />
                )}
            </button>
        </>
    );
}
