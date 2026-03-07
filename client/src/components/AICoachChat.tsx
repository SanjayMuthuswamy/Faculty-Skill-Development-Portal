import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiCoachApi, ChatMessage } from '../lib/api/aiCoach';
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react';

const QUICK_ACTIONS = [
    'Where am I weak?',
    'How can I improve my score?',
    'What should I study next?',
    'Show my progress',
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && (
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-white" />
                </div>
            )}
            <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}
            >
                {msg.content}
            </div>
        </div>
    );
}

export function AICoachChat() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasOpened, setHasOpened] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mutation = useMutation({
        mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
            aiCoachApi.chat(message, history),
        onSuccess: (data, variables) => {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: data.reply },
            ]);
        },
        onError: () => {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        },
    });

    // Auto-scroll to bottom when new messages come in
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            if (!hasOpened) {
                setHasOpened(true);
                // Welcome message
                setMessages([{
                    role: 'assistant',
                    content: "Hi! 👋 I'm your AI Learning Coach. I can analyze your test performance and help you improve. What would you like to know?",
                }]);
            }
        }
    }, [open]);

    const sendMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || mutation.isPending) return;

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');

        // Send only previous messages as history (exclude the current one)
        mutation.mutate({
            message: trimmed,
            history: messages, // history = everything before this message
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const showQuickActions = messages.length <= 1 && !mutation.isPending;

    return (
        <>
            {/* Chat Panel */}
            {open && (
                <div className="fixed bottom-20 right-4 z-50 w-[360px] max-h-[560px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-600">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">AI Learning Coach</p>
                                <p className="text-[10px] text-blue-200">Powered by AI · Based on your test history</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '380px' }}>
                        {messages.map((msg, i) => (
                            <MessageBubble key={i} msg={msg} />
                        ))}

                        {/* Typing indicator */}
                        {mutation.isPending && (
                            <div className="flex gap-2 items-center">
                                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                    <span className="text-xs text-slate-400 ml-1">Thinking…</span>
                                </div>
                            </div>
                        )}

                        {/* Quick actions */}
                        {showQuickActions && (
                            <div className="pt-2 space-y-1.5">
                                <p className="text-[11px] text-slate-400 font-medium px-1">Quick questions:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_ACTIONS.map(action => (
                                        <button
                                            key={action}
                                            onClick={() => sendMessage(action)}
                                            className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-slate-100 bg-white flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything about your performance…"
                            disabled={mutation.isPending}
                            className="flex-1 text-sm h-9 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 bg-slate-50"
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
            )}

            {/* FAB Toggle Button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className="fixed bottom-4 right-4 z-50 h-13 w-13 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
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
