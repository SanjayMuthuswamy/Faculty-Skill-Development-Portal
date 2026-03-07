import { useQuery } from '@tanstack/react-query';
import { coursesApi, CourseAnalytics } from '../../lib/api/courses';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, Users, CheckCircle, TrendingUp, BookOpen } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function CourseAnalyticsPage() {
    const { data: analytics = [], isLoading } = useQuery({
        queryKey: ['course-analytics'],
        queryFn: coursesApi.getAnalytics,
    });

    if (isLoading) return (
        <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    const totalEnrolled = analytics.reduce((sum: number, c: CourseAnalytics) => sum + c.total_enrolled, 0);
    const totalCompleted = analytics.reduce((sum: number, c: CourseAnalytics) => sum + c.total_completed, 0);
    const avgScore = analytics.length
        ? analytics.reduce((sum: number, c: CourseAnalytics) => sum + c.average_score, 0) / analytics.length
        : 0;
    const avgCompletion = analytics.length
        ? analytics.reduce((sum: number, c: CourseAnalytics) => sum + c.completion_rate, 0) / analytics.length
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Course Analytics</h1>
                <p className="text-slate-500 text-sm mt-0.5">Track enrollment, completion rates, and performance across all courses.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Enrollments', value: totalEnrolled, icon: Users, color: 'blue' },
                    { label: 'Completions', value: totalCompleted, icon: CheckCircle, color: 'green' },
                    { label: 'Avg Score', value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: 'purple' },
                    { label: 'Avg Completion', value: `${avgCompletion.toFixed(1)}%`, icon: BookOpen, color: 'orange' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className={`h-9 w-9 rounded-xl bg-${color}-100 flex items-center justify-center mb-3`}>
                            <Icon className={`h-5 w-5 text-${color}-600`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </div>
                ))}
            </div>

            {analytics.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                    <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p>No course data available yet.</p>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Enrollment Bar Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4">Enrollments per Course</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={analytics} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <XAxis dataKey="course_title" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="total_enrolled" fill="#2563eb" radius={[4, 4, 0, 0]} name="Enrolled" />
                                <Bar dataKey="total_completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Completion Rate Pie */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4">Completion Rate by Course</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={analytics.map((c: CourseAnalytics) => ({ name: c.course_title, value: Math.round(c.completion_rate) }))}
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

                    {/* Per-course Table */}
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
                                    {analytics.map((c: CourseAnalytics) => (
                                        <tr key={c.course_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4 font-medium text-slate-800">{c.course_title}</td>
                                            <td className="py-3 pr-4 text-right text-slate-600">{c.total_enrolled}</td>
                                            <td className="py-3 pr-4 text-right text-slate-600">{c.total_completed}</td>
                                            <td className="py-3 pr-4 text-right">
                                                <span className={`font-semibold ${c.completion_rate >= 70 ? 'text-green-600' : c.completion_rate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                    {c.completion_rate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <span className={`font-semibold ${c.average_score >= 70 ? 'text-green-600' : c.average_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                                    {c.average_score.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
