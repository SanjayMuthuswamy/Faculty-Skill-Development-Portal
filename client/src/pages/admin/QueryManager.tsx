import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queriesApi, FacultyQuery } from '../../lib/api/forum';
import { Loader2, CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5" />,
    reviewed: <AlertCircle className="h-3.5 w-3.5" />,
    resolved: <CheckCircle className="h-3.5 w-3.5" />,
};

export default function QueryManagerPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');

    const { data: queries = [], isLoading } = useQuery({
        queryKey: ['admin-queries', statusFilter],
        queryFn: () => queriesApi.listAll(statusFilter || undefined),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => queriesApi.updateStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-queries'] }),
    });

    const pending = queries.filter((q: FacultyQuery) => q.status === 'pending').length;
    const reviewed = queries.filter((q: FacultyQuery) => q.status === 'reviewed').length;
    const resolved = queries.filter((q: FacultyQuery) => q.status === 'resolved').length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Faculty Queries</h1>
                <p className="text-slate-500 text-sm mt-0.5">Review and respond to faculty submissions.</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', count: pending, color: 'yellow' },
                    { label: 'Reviewed', count: reviewed, color: 'blue' },
                    { label: 'Resolved', count: resolved, color: 'green' },
                ].map(({ label, count, color }) => (
                    <div key={label} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-t-4 border-t-${color}-400`}>
                        <p className="text-2xl font-bold text-slate-900">{count}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-slate-400" />
                <div className="flex gap-2">
                    {['', 'pending', 'reviewed', 'resolved'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                        >
                            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{q.id.slice(0, 8)}…</td>
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
                                        <div className="flex justify-end gap-1">
                                            {q.status === 'pending' && (
                                                <button
                                                    onClick={() => updateMutation.mutate({ id: q.id, status: 'reviewed' })}
                                                    className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
                                                >Mark Reviewed</button>
                                            )}
                                            {q.status !== 'resolved' && (
                                                <button
                                                    onClick={() => updateMutation.mutate({ id: q.id, status: 'resolved' })}
                                                    className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-colors"
                                                >Resolve</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
