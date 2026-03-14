import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queriesApi, FacultyQuery } from '../../lib/api/forum';
import { Loader2, CheckCircle, Clock, AlertCircle, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { motion } from 'framer-motion';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
};

const STATUS_ICONS: Record<string, ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5" />,
    reviewed: <AlertCircle className="h-3.5 w-3.5" />,
    resolved: <CheckCircle className="h-3.5 w-3.5" />,
};

export default function QueryManagerPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 8;

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch]);

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ['admin-queries', statusFilter, debouncedSearch, page, pageSize],
        queryFn: () => queriesApi.listAll({
            status: statusFilter || undefined,
            search: debouncedSearch || undefined,
            page,
            pageSize,
        }),
    });

    const statsQuery = useQuery({
        queryKey: ['admin-queries-stats'],
        queryFn: () => queriesApi.listAll({ page: 1, pageSize: 100 }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => queriesApi.updateStatus(id, status),
        onSuccess: (_, variables) => {
            addToast(`Query marked as ${variables.status}.`, 'success');
            queryClient.invalidateQueries({ queryKey: ['admin-queries'] });
            queryClient.invalidateQueries({ queryKey: ['admin-queries-stats'] });
        },
        onError: () => addToast('Unable to update query status. Try again.', 'error'),
    });

    const queries = data?.items ?? [];

    const summary = useMemo(() => {
        const all = statsQuery.data?.items ?? [];
        return {
            pending: all.filter((q: FacultyQuery) => q.status === 'pending').length,
            reviewed: all.filter((q: FacultyQuery) => q.status === 'reviewed').length,
            resolved: all.filter((q: FacultyQuery) => q.status === 'resolved').length,
        };
    }, [statsQuery.data]);

    const summaryCards = [
        { label: 'Pending', count: statusFilter ? queries.filter((q) => q.status === 'pending').length : summary.pending, borderClass: 'border-t-yellow-400' },
        { label: 'Reviewed', count: statusFilter ? queries.filter((q) => q.status === 'reviewed').length : summary.reviewed, borderClass: 'border-t-blue-400' },
        { label: 'Resolved', count: statusFilter ? queries.filter((q) => q.status === 'resolved').length : summary.resolved, borderClass: 'border-t-green-400' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Faculty Queries</h1>
                <p className="text-slate-500 text-sm mt-0.5">Review and respond to faculty submissions.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {summaryCards.map(({ label, count, borderClass }) => (
                    <div key={label} className={cn('rounded-2xl border border-slate-100 bg-white p-5 shadow-sm border-t-4', borderClass)}>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by faculty, category, or query text"
                            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                        {['', 'pending', 'reviewed', 'resolved'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                                    statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                )}
                            >
                                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>
            ) : isError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    Unable to load queries. Please refresh or try again shortly.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Query ID</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Faculty</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Category</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Description</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Date</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
                                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {queries.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No queries found.</td></tr>
                                ) : queries.map((q: FacultyQuery) => (
                                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{q.id.slice(0, 8)}...</td>
                                        <td className="px-5 py-3 font-semibold text-slate-700">{q.faculty_name}</td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{q.category}</span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 max-w-xs">
                                            <p className="line-clamp-2 text-xs">{q.description}</p>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{format(new Date(q.created_at), 'MMM d, yyyy')}</td>
                                        <td className="px-5 py-3">
                                            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[q.status])}>
                                                {STATUS_ICONS[q.status]}
                                                {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <QueryActions
                                                query={q}
                                                isUpdating={updateMutation.isPending}
                                                onUpdate={(status) => updateMutation.mutate({ id: q.id, status })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 lg:hidden">
                        {queries.length === 0 ? (
                            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">No queries found.</div>
                        ) : queries.map((q, index) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{q.faculty_name}</p>
                                        <p className="mt-0.5 font-mono text-xs text-slate-400">{q.id.slice(0, 8)}...</p>
                                    </div>
                                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', STATUS_COLORS[q.status])}>
                                        {STATUS_ICONS[q.status]}
                                        {q.status}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">{format(new Date(q.created_at), 'MMM d, yyyy')}</p>
                                <p className="mt-2 text-sm text-slate-700 line-clamp-3">{q.description}</p>
                                <div className="mt-3">
                                    <QueryActions
                                        query={q}
                                        isUpdating={updateMutation.isPending}
                                        onUpdate={(status) => updateMutation.mutate({ id: q.id, status })}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                            Showing {queries.length} of {data?.total ?? 0} queries
                            {isFetching && ' (refreshing...)'}
                        </p>
                        <Pagination
                            currentPage={data?.page ?? 1}
                            totalPages={data?.total_pages ?? 1}
                            onPageChange={setPage}
                            className="py-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function QueryActions({
    query,
    isUpdating,
    onUpdate,
}: {
    query: FacultyQuery;
    isUpdating: boolean;
    onUpdate: (status: 'reviewed' | 'resolved') => void;
}) {
    return (
        <div className="flex flex-wrap justify-end gap-1">
            {query.status === 'pending' && (
                <button
                    onClick={() => onUpdate('reviewed')}
                    disabled={isUpdating}
                    className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isUpdating ? 'Updating...' : 'Mark Reviewed'}
                </button>
            )}
            {query.status !== 'resolved' && (
                <button
                    onClick={() => onUpdate('resolved')}
                    disabled={isUpdating}
                    className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isUpdating ? 'Updating...' : 'Resolve'}
                </button>
            )}
        </div>
    );
}
