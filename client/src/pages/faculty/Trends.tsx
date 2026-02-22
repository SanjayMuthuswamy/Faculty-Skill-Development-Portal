import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsApi, NewsItem } from '../../lib/api/news';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Newspaper, ExternalLink, RefreshCw, Clock, Filter, CheckCircle } from 'lucide-react';

// A card selected for the detail modal
interface SelectedCard {
    article: NewsItem;
    topic: string;
}

export default function Trends() {
    const queryClient = useQueryClient();
    const [selectedTopic, setSelectedTopic] = useState('AI');
    const [selected, setSelected] = useState<SelectedCard | null>(null);

    const defaultTopics = ['AI', 'Cloud Computing', 'Cybersecurity', 'DBMS', 'Teaching Pedagogy', 'Data Science'];

    const { data: newsResponse, isLoading } = useQuery({
        queryKey: ['trends', selectedTopic],
        queryFn: () => newsApi.getNews(selectedTopic),
        staleTime: 1000 * 60 * 10, // consider fresh for 10 minutes
    });

    const refreshMutation = useMutation({
        mutationFn: () => newsApi.getNews(selectedTopic),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trends', selectedTopic] });
        },
    });

    const articles = newsResponse?.items || [];
    const lastFetchedAt = newsResponse?.lastFetchedAt;
    const isCached = newsResponse?.cached;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trends & Resources</h1>
                    <p className="text-gray-500">Stay updated with the latest in technology and pedagogy.</p>
                </div>
                {lastFetchedAt && (
                    <div className="flex items-center gap-3 text-sm text-gray-500 bg-white p-2 rounded-lg border shadow-sm">
                        <Clock className="h-4 w-4" />
                        <span>Last updated: {new Date(lastFetchedAt).toLocaleTimeString()}</span>
                        {isCached && (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle className="h-3 w-3" /> Cached
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => refreshMutation.mutate()}
                            disabled={refreshMutation.isPending}
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                )}
            </div>

            {/* Topic Filter Pills */}
            <div className="flex flex-wrap gap-2 pb-2">
                {defaultTopics.map((topic) => (
                    <button
                        key={topic}
                        onClick={() => setSelectedTopic(topic)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTopic === topic
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
                            }`}
                    >
                        {topic}
                    </button>
                ))}
            </div>

            {/* Article Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : articles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                    <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No articles found for "{selectedTopic}".</p>
                    <p className="text-gray-400 text-sm mt-1">This may be due to API rate limits. Try again later.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map((article) => (
                        <Card
                            key={article.id}
                            className="group hover:shadow-lg transition-all border-none shadow-sm cursor-pointer overflow-hidden flex flex-col"
                            onClick={() => setSelected({ article, topic: selectedTopic })}
                        >
                            {/* Image or gradient fallback */}
                            {article.imageUrl ? (
                                <img
                                    src={article.imageUrl}
                                    alt={article.title}
                                    className="h-36 w-full object-cover"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`h-36 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${article.imageUrl ? 'hidden' : ''}`}>
                                <Newspaper className="h-12 w-12 text-white/50 group-hover:scale-110 transition-transform" />
                            </div>

                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                        {selectedTopic}
                                    </Badge>
                                    <span className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{article.source}</span>
                                </div>
                                <CardTitle className="text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {article.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-gray-500 line-clamp-3">
                                    {article.summary || 'No summary available.'}
                                </p>
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                        {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Unknown date'}
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                                        Read more →
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3 text-gray-500 text-sm">
                <Filter className="h-5 w-5 text-gray-400 shrink-0" />
                <p><strong>Note:</strong> Content is cached for up to 6 hours to ensure reliability. Click the refresh icon to request fresh data.</p>
            </div>

            {/* Article Detail Modal */}
            <Modal
                isOpen={!!selected}
                onClose={() => setSelected(null)}
                title="Resource Details"
            >
                {selected && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">{selected.topic}</Badge>
                            <span className="text-sm text-gray-500">
                                • {selected.article.source}
                                {selected.article.publishedAt && ` • ${new Date(selected.article.publishedAt).toLocaleDateString()}`}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                            {selected.article.title}
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg border text-gray-700 leading-relaxed text-sm">
                            {selected.article.summary || 'No summary available for this article.'}
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => window.open(selected.article.url, '_blank')}
                                disabled={!selected.article.url}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Source
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
