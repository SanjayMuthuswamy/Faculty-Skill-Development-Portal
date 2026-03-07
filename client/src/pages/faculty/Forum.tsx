import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumApi, Discussion, DiscussionDetail } from '../../lib/api/forum';
import { useAuth } from '../../app/providers/AuthProvider';
import { MessageSquare, Plus, ChevronRight, Reply, X, Loader2, Hash } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const CATEGORIES = [
    { id: 'all', label: 'All Topics' },
    { id: 'teaching_methods', label: 'Teaching Methods' },
    { id: 'technology', label: 'Technology' },
    { id: 'ai_tools', label: 'AI Tools' },
    { id: 'research', label: 'Research' },
    { id: 'general', label: 'General' },
];

function ThreadDetail({ thread, onClose }: { thread: DiscussionDetail; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [replyText, setReplyText] = useState('');

    const replyMutation = useMutation({
        mutationFn: (content: string) => forumApi.addReply(thread.id, content),
        onSuccess: () => {
            setReplyText('');
            queryClient.invalidateQueries({ queryKey: ['discussion', thread.id] });
            queryClient.invalidateQueries({ queryKey: ['discussions'] });
        },
    });

    const { data: detail, isLoading } = useQuery({
        queryKey: ['discussion', thread.id],
        queryFn: () => forumApi.getDiscussion(thread.id),
        initialData: thread,
    });

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex-1 min-w-0 pr-4">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{detail?.category?.replace('_', ' ')}</span>
                        <h2 className="font-bold text-slate-800 text-base mt-0.5">{detail?.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">by {detail?.author_name} · {detail?.created_at && format(new Date(detail.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl">{detail?.content}</p>
                    {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>}
                    {detail?.replies?.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{detail.replies.length} Replies</p>
                            {detail.replies.map(reply => (
                                <div key={reply.id} className="flex gap-3">
                                    <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                                        {reply.author_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-700">{reply.author_name}</span>
                                            <span className="text-xs text-slate-400">{format(new Date(reply.created_at), 'MMM d, h:mm a')}</span>
                                        </div>
                                        <p className="text-sm text-slate-600">{reply.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Reply box */}
                <div className="px-6 py-4 border-t border-slate-100">
                    <div className="flex gap-3">
                        <textarea
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            rows={2}
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                        />
                        <button
                            onClick={() => replyMutation.mutate(replyText)}
                            disabled={!replyText.trim() || replyMutation.isPending}
                            className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        >
                            <Reply className="h-4 w-4" />
                            Reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NewThreadModal({ onClose, category }: { onClose: () => void; category: string }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ title: '', content: '', category: category !== 'all' ? category : 'general' });

    const createMutation = useMutation({
        mutationFn: forumApi.createDiscussion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['discussions'] });
            onClose();
        },
    });

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Start a New Thread</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Category</label>
                        <select className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                            value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                            {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Title</label>
                        <input className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Thread title..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Content</label>
                        <textarea className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 resize-none"
                            rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Share your thoughts..." />
                    </div>
                    <button
                        onClick={() => createMutation.mutate(form)}
                        disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        {createMutation.isPending ? 'Posting...' : 'Post Thread'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ForumPage() {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeThread, setActiveThread] = useState<DiscussionDetail | null>(null);
    const [showNew, setShowNew] = useState(false);

    const { data: discussions = [], isLoading } = useQuery({
        queryKey: ['discussions', activeCategory],
        queryFn: () => forumApi.listDiscussions(activeCategory !== 'all' ? activeCategory : undefined),
    });

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Discussion Forum</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Share ideas, ask questions, and collaborate with fellow faculty.</p>
                </div>
                <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                    <Plus className="h-4 w-4" /> New Thread
                </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                            activeCategory === cat.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        )}
                    >
                        <Hash className="h-3 w-3" />{cat.label}
                    </button>
                ))}
            </div>

            {/* Thread List */}
            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>
            ) : discussions.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                    <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">No threads yet in this category.</p>
                    <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-blue-500 hover:underline">Be the first to post</button>
                </div>
            ) : (
                <div className="space-y-2">
                    {discussions.map((d: Discussion) => (
                        <button
                            key={d.id}
                            onClick={() => forumApi.getDiscussion(d.id).then(detail => setActiveThread(detail))}
                            className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-blue-500 uppercase">{d.category?.replace('_', ' ')}</span>
                                </div>
                                <p className="font-semibold text-slate-800 text-sm truncate">{d.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">by {d.author_name} · {format(new Date(d.created_at), 'MMM d, yyyy')} · {d.reply_count} replies</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {showNew && <NewThreadModal onClose={() => setShowNew(false)} category={activeCategory} />}
            {activeThread && <ThreadDetail thread={activeThread} onClose={() => setActiveThread(null)} />}
        </div>
    );
}
