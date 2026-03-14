import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsApi, NewsItem } from '../../lib/api/news';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
    Newspaper, ExternalLink, RefreshCw, Plus, X,
    Settings, CheckCircle, BookOpen, Loader2
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

// ─── Constants ───────────────────────────────────────────────────────────────
const PRESET_TOPICS = [
    'AI', 'Cloud Computing', 'Cybersecurity', 'Data Science',
    'Machine Learning', 'Web Development', 'Research Methodology',
    'Teaching Pedagogy', 'DBMS', 'IoT', 'Blockchain', 'DevOps',
    'Python', 'Deep Learning', 'Natural Language Processing'
];

const sanitizeText = (value: string | null | undefined) =>
    (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ─── Sub-components ──────────────────────────────────────────────────────────

function NewsCard({ article, topic, onClick }: { article: NewsItem; topic: string; onClick: () => void }) {
    const [imgSrc, setImgSrc] = useState(
        article.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(`${topic}-${article.id}`)}/640/360`
    );

    return (
        <Card
            className="group hover:shadow-lg transition-all border-none shadow-sm cursor-pointer overflow-hidden flex flex-col"
            onClick={onClick}
        >
            <img
                src={imgSrc}
                alt={article.title}
                className="h-36 w-full object-cover"
                onError={() => {
                    const fallback = `https://picsum.photos/seed/fallback-${encodeURIComponent(article.id)}/640/360`;
                    if (imgSrc !== fallback) setImgSrc(fallback);
                }}
            />
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-xs">
                        {topic}
                    </Badge>
                    <span className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{article.source}</span>
                </div>
                <CardTitle className="text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-sm text-gray-500 line-clamp-3">
                    {sanitizeText(article.summary) || 'No summary available.'}
                </p>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                        {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Unknown date'}
                    </span>
                    <span className="text-xs font-bold text-blue-600 group-hover:underline">Read more →</span>
                </div>
            </CardContent>
        </Card>
    );
}

function TopicSection({
    topic,
    onArticleClick,
}: {
    topic: string;
    onArticleClick: (article: NewsItem, topic: string) => void;
}) {
    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['news', topic],
        queryFn: () => newsApi.getNews(topic),
        staleTime: 1000 * 60 * 10,
    });

    const articles = data?.items ?? [];

    return (
        <section className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-800">{topic}</h2>
                    {data?.cached && (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="h-3 w-3" /> Cached
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    {data?.lastFetchedAt && (
                        <span>Updated {new Date(data.lastFetchedAt).toLocaleTimeString()}</span>
                    )}
                </button>
            </div>

            {/* Loading skeletons */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div className="text-center py-8 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-rose-500 font-medium text-sm">Failed to load news for "{topic}".</p>
                    <button onClick={() => refetch()} className="text-xs text-rose-600 underline mt-1">Retry</button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && articles.length === 0 && (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed">
                    <Newspaper className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No articles found for "{topic}".</p>
                    <p className="text-gray-400 text-xs mt-1">API rate limit may apply. Try again later.</p>
                </div>
            )}

            {/* Articles grid */}
            {!isLoading && articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {articles.map(article => (
                        <NewsCard
                            key={article.id}
                            article={article}
                            topic={topic}
                            onClick={() => onArticleClick(article, topic)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface SelectedCard { article: NewsItem; topic: string }

export default function Trends() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [showManager, setShowManager] = useState(false);
    const [selected, setSelected] = useState<SelectedCard | null>(null);
    const [customTopic, setCustomTopic] = useState('');

    // Load user's saved preferences
    const { data: prefs, isLoading: prefsLoading } = useQuery({
        queryKey: ['news-preferences'],
        queryFn: newsApi.getMyNewsPreferences,
    });

    const savedTopics: string[] = prefs?.topics ?? [];

    // Mutation to save preferences
    const saveMutation = useMutation({
        mutationFn: (topics: string[]) => newsApi.updateMyNewsPreferences(topics),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['news-preferences'] });
            addToast('Preferences updated successfully', 'success');
        },
        onError: (error: any) => {
            console.error('Failed to update news preferences:', error);
            addToast(error.response?.data?.detail || 'Failed to update preferences', 'error');
        }
    });

    const addTopic = (topic: string) => {
        const trimmed = topic.trim();
        if (!trimmed || savedTopics.includes(trimmed) || savedTopics.length >= 10) return;
        saveMutation.mutate([...savedTopics, trimmed]);
        setCustomTopic('');
    };

    const removeTopic = (topic: string) => {
        saveMutation.mutate(savedTopics.filter(t => t !== topic));
    };

    // Topics not yet added by the user
    const availablePresets = PRESET_TOPICS.filter(t => !savedTopics.includes(t));

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trends & Resources</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Personalised news feed based on your selected topics.
                    </p>
                </div>
                <Button
                    onClick={() => setShowManager(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                    <Settings className="h-4 w-4" /> Manage Sections
                </Button>
            </div>

            {/* Active topic pills */}
            {savedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {savedTopics.map(topic => (
                        <span
                            key={topic}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium"
                        >
                            {topic}
                            <button
                                onClick={() => removeTopic(topic)}
                                className="text-blue-200 hover:text-white transition-colors"
                                title={`Remove ${topic}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Loading prefs */}
            {prefsLoading && (
                <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading your sections…
                </div>
            )}

            {/* No sections added yet */}
            {!prefsLoading && savedTopics.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold">You haven't added any sections yet.</p>
                    <p className="text-gray-400 text-sm mt-1 mb-4">Click "Manage Sections" to pick topics you care about.</p>
                    <Button onClick={() => setShowManager(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" /> Add Sections
                    </Button>
                </div>
            )}

            {/* One section per topic */}
            {!prefsLoading && savedTopics.map(topic => (
                <TopicSection
                    key={topic}
                    topic={topic}
                    onArticleClick={(article, t) => setSelected({ article, topic: t })}
                />
            ))}

            {/* ── Manage Sections Modal ── */}
            <Modal
                isOpen={showManager}
                onClose={() => setShowManager(false)}
                title="Manage Your News Sections"
            >
                <div className="space-y-5">
                    {/* Currently active */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                            Active sections <span className="text-gray-400 font-normal">({savedTopics.length}/10)</span>
                        </p>
                        {savedTopics.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">None yet — add some below.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {savedTopics.map(topic => (
                                    <span
                                        key={topic}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium"
                                    >
                                        {topic}
                                        <button
                                            onClick={() => removeTopic(topic)}
                                            disabled={saveMutation.isPending}
                                            className="text-blue-200 hover:text-white transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <hr />

                    {/* Custom topic input */}
                    <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">Add a custom topic</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customTopic}
                                onChange={e => setCustomTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTopic(customTopic)}
                                placeholder="e.g. Quantum Computing"
                                maxLength={40}
                                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                            <Button
                                onClick={() => addTopic(customTopic)}
                                disabled={!customTopic.trim() || savedTopics.includes(customTopic.trim()) || savedTopics.length >= 10 || saveMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700 h-10 px-4"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Preset suggestions */}
                    {availablePresets.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2">Suggested topics</p>
                            <div className="flex flex-wrap gap-2">
                                {availablePresets.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => addTopic(topic)}
                                        disabled={savedTopics.length >= 10 || saveMutation.isPending}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 text-slate-600 hover:text-blue-700 text-sm font-medium transition-all disabled:opacity-40"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {saveMutation.isPending && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                        </div>
                    )}

                    <div className="pt-2 flex justify-end">
                        <Button onClick={() => setShowManager(false)} className="bg-blue-600 hover:bg-blue-700">
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ── Article Detail Modal ── */}
            <Modal
                isOpen={!!selected}
                onClose={() => setSelected(null)}
                title="Resource Details"
            >
                {selected && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">{selected.topic}</Badge>
                            <span className="text-sm text-gray-500">
                                • {selected.article.source}
                                {selected.article.publishedAt && ` • ${new Date(selected.article.publishedAt).toLocaleDateString()}`}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{selected.article.title}</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border text-gray-700 text-sm leading-relaxed">
                            {selected.article.summary || 'No summary available for this article.'}
                        </div>
                        <div className="pt-2 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => window.open(selected.article.url, '_blank')}
                                disabled={!selected.article.url}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" /> Visit Source
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
