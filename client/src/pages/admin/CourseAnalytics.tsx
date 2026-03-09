import { useQuery } from '@tanstack/react-query';
import { coursesApi, CourseAnalytics } from '../../lib/api/courses';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, Users, CheckCircle, TrendingUp, BookOpen } from 'lucide-react';
import { useMemo } from 'react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const SUMMARY_ICON_STYLES: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
};

function toSafeNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function truncateCourseTitle(title: string, maxLen: number = 30) {
    if (!title) return '';
    if (title.length <= maxLen) return title;
    return `${title.slice(0, maxLen - 3)}...`;
}

function EnrollmentTooltip({ active, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg min-w-[220px]">
            <p className="text-sm font-semibold text-slate-900 mb-2">{row.course_title}</p>
            <div className="space-y-1 text-xs">
                <p className="text-blue-600 font-semibold">Enrolled: {toSafeNumber(row.total_enrolled)}</p>
                <p className="text-emerald-600 font-semibold">Completed: {toSafeNumber(row.total_completed)}</p>
            </div>
        </div>
    );
}

export default function CourseAnalyticsPage() {
    const { data: analytics = [], isLoading } = useQuery({
        queryKey: ['course-analytics'],
        queryFn: coursesApi.getAnalytics,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const totalEnrolled = analytics.reduce((sum: number, c: CourseAnalytics) => sum + toSafeNumber(c.total_enrolled), 0);
    const totalCompleted = analytics.reduce((sum: number, c: CourseAnalytics) => sum + toSafeNumber(c.total_completed), 0);
    const avgScore = analytics.length
        ? analytics.reduce((sum: number, c: CourseAnalytics) => sum + toSafeNumber(c.average_score), 0) / analytics.length
        : 0;
    const avgCompletion = analytics.length
        ? analytics.reduce((sum: number, c: CourseAnalytics) => sum + toSafeNumber(c.completion_rate), 0) / analytics.length
        : 0;

    const enrollmentChartData = useMemo(
        () =>
            analytics
                .map((c: CourseAnalytics) => ({
                    ...c,
                    short_title: truncateCourseTitle(c.course_title, 30),
                    total_enrolled: toSafeNumber(c.total_enrolled),
                    total_completed: toSafeNumber(c.total_completed),
                }))
                .sort((a, b) => b.total_enrolled - a.total_enrolled),
        [analytics]
    );

    const barChartHeight = Math.max(300, enrollmentChartData.length * 44);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Course Analytics</h1>
                <p className="text-slate-500 text-sm mt-0.5">Track enrollment, completion rates, and performance across all courses.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Enrollments', value: totalEnrolled, icon: Users, color: 'blue' },
                    { label: 'Completions', value: totalCompleted, icon: CheckCircle, color: 'green' },
                    { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: 'purple' },
                    { label: 'Avg Completion', value: `${avgCompletion.toFixed(1)}%`, icon: BookOpen, color: 'orange' },
                ].map(({ label, value, icon: Icon, color }) => {
                    const style = SUMMARY_ICON_STYLES[color] ?? SUMMARY_ICON_STYLES.blue;
                    return (
                        <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${style.bg}`}>
                                <Icon className={`h-5 w-5 ${style.text}`} />
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                        </div>
                    );
                })}
            </div>

            {analytics.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                    <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p>No course data available yet.</p>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4">Enrollments per Course</h3>
                        <ResponsiveContainer width="100%" height={barChartHeight}>
                            <BarChart data={enrollmentChartData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis
                                    dataKey="short_title"
                                    type="category"
                                    width={170}
                                    tick={{ fontSize: 11, fill: '#475569' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<EnrollmentTooltip />} />
                                <Bar dataKey="total_enrolled" fill="#2563eb" radius={[4, 4, 0, 0]} name="Enrolled" />
                                <Bar dataKey="total_completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4">Completion Rate by Course</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={analytics.map((c: CourseAnalytics) => ({ name: c.course_title, value: Math.round(toSafeNumber(c.completion_rate)) }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ value }) => `${value}%`}
                                >
                                    {analytics.map((_: CourseAnalytics, i: number) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                                <Tooltip formatter={(v) => `${v}%`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
                        <h3 className="font-bold text-slate-800 mb-4">Detailed Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-400 font-semibold border-b border-slate-100">
                                        <th className="text-left pb-3 pr-4">Course</th>
                                        <th className="text-right pb-3 pr-4">Enrolled</th>
                                        <th className="text-right pb-3 pr-4">Completed</th>
                                        <th className="text-right pb-3 pr-4">Completion Rate</th>
                                        <th className="text-right pb-3">Avg Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {analytics.map((c: CourseAnalytics) => {
                                        const completionRate = toSafeNumber(c.completion_rate);
                                        const averageScore = toSafeNumber(c.average_score);
                                        return (
                                            <tr key={c.course_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 pr-4 font-medium text-slate-800">{c.course_title}</td>
                                                <td className="py-3 pr-4 text-right text-slate-600">{toSafeNumber(c.total_enrolled)}</td>
                                                <td className="py-3 pr-4 text-right text-slate-600">{toSafeNumber(c.total_completed)}</td>
                                                <td className="py-3 pr-4 text-right">
                                                    <span className={`font-semibold ${completionRate >= 70 ? 'text-green-600' : completionRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                        {completionRate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`font-semibold ${averageScore >= 70 ? 'text-green-600' : averageScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                        {averageScore.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
