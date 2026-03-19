import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiCoachApi, ChatMessage } from '../../lib/api/aiCoach';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/api/error';

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
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                </div>
            )}
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                    }`}
            >
                {msg.content}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {msg.actions.map((action, idx) => (
                            <button
                                key={`${action.url}-${idx}`}
                                onClick={() => onAction(action.url)}
                                className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                            >
                                <p className="text-xs font-bold">{action.label}</p>
                                {action.description && (
                                    <p className="text-[11px] text-blue-600 mt-0.5">{action.description}</p>
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
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: "Hi! 👋 I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
    }]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
            aiCoachApi.chat(message, history),
        onSuccess: (data) => {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: data.reply, actions: data.actions || [] },
            ]);
        },
        onError: (error) => {
            setMessages(prev => [
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
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
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
        setMessages([{
            role: 'assistant',
            content: "Hi! 👋 I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
        }]);
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
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">AI Learning Coach</h1>
                        <p className="text-xs text-slate-500">Powered by AI · Personalized to your test history</p>
                    </div>
                </div>
                <button
                    onClick={resetChat}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Reset conversation"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    New Chat
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4 min-h-0">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} onAction={handleAction} />
                ))}

                {/* Typing indicator */}
                {mutation.isPending && (
                    <div className="flex gap-3 items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span className="text-xs text-slate-400">Thinking…</span>
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                {showQuickActions && (
                    <div className="pt-2 space-y-2">
                        <p className="text-[11px] text-slate-400 font-medium px-1">Quick questions:</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={action}
                                    onClick={() => sendMessage(action)}
                                    className="text-xs px-3 py-2 rounded-full border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 transition-colors font-medium shadow-sm"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your performance…"
                    disabled={mutation.isPending}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 disabled:opacity-60"
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || mutation.isPending}
                    className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
                >
                    <Send className="h-4 w-4 text-white" />
                </button>
            </div>
        </div>
    );
}
