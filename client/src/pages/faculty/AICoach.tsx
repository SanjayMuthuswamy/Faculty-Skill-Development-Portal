import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiCoachApi, ChatMessage } from '../../lib/api/aiCoach';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/api/error';
import { FormattedCoachMessage } from '../../components/ui/FormattedCoachMessage';

const QUICK_ACTIONS = [
    'Where am I weak?',
    'How can I improve my score?',
    'What should I study next?',
    'Show my progress',
    'Give me a study plan',
    'Which topics need attention?',
];

function MessageBubble({ msg, onAction }: { msg: ChatMessage; onAction: (url: string) => void }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && (
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                </div>
            )}
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser
                    ? 'rounded-tr-sm bg-blue-600 text-white'
                    : 'rounded-tl-sm border border-slate-100 bg-white text-slate-800'
                    }`}
            >
                {isUser ? msg.content : <FormattedCoachMessage text={msg.content} />}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {msg.actions.map((action, idx) => (
                            <button
                                key={`${action.url}-${idx}`}
                                onClick={() => onAction(action.url)}
                                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-blue-700 transition-colors hover:bg-blue-100"
                            >
                                <p className="text-xs font-bold">{action.label}</p>
                                {action.description && (
                                    <p className="mt-0.5 text-[11px] text-blue-600">{action.description}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AICoachPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: "Hi! I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
        },
    ]);
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
        onError: (error) => {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
            addToast(getApiErrorMessage(error, 'AI coach request failed'), 'error');
        },
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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

    const resetChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: "Hi! I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
            },
        ]);
        setInput('');
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
        <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">AI Learning Coach</h1>
                        <p className="text-xs text-slate-500">Powered by AI · Personalized to your test history</p>
                    </div>
                </div>
                <button
                    onClick={resetChat}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    title="Reset conversation"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    New Chat
                </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} onAction={handleAction} />
                ))}

                {mutation.isPending && (
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span className="text-xs text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}

                {showQuickActions && (
                    <div className="space-y-2 pt-2">
                        <p className="px-1 text-[11px] font-medium text-slate-400">Quick questions:</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_ACTIONS.map((action) => (
                                <button
                                    key={action}
                                    onClick={() => sendMessage(action)}
                                    className="rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your performance..."
                    disabled={mutation.isPending}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
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
    );
}
