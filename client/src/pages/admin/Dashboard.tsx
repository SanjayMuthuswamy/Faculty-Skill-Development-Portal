import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import {
    Users,
    TrendingUp,
    BrainCircuit,
    ShieldCheck,
    BookOpen,
    BarChart3,
    PieChart as PieIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { useMemo } from 'react';

export default function AdminDashboard() {
    const { data: departmentStats, isLoading: isLoadingDept } = useQuery({
        queryKey: ['admin-dept-summary'],
        queryFn: analyticsApi.getDepartmentSummary,
    });

    // Aggregated Metrics
    const metrics = useMemo(() => {
        if (!departmentStats) return { total: 0, highRisk: 0, avgProb: 0, verifiedSkills: 0 };

        const total = departmentStats.reduce((acc, d) => acc + d.faculty_count, 0);
        const totalEnrollments = departmentStats.reduce((acc, d) => acc + (d.total_enrollments || 0), 0);
        const avgProb = Math.round(departmentStats.reduce((acc, d) => acc + d.avg_accuracy, 0) / (departmentStats.length || 1));

        // Total verified skills from all departments
        const verifiedSkillsTotal = Math.round(
            departmentStats.reduce(
                (acc, d) => acc + ((d.verified_skills_rate || 0) * (d.faculty_count || 0)) / 100,
                0
            )
        );

        // High risk proxy: departments with < 50% accuracy
        const risky = departmentStats.filter(d => d.avg_accuracy < 50).length;

        return {
            total,
            totalEnrollments,
            highRisk: risky,
            avgProb,
            verifiedSkills: verifiedSkillsTotal
        };
    }, [departmentStats]);

    const chartData = useMemo(() => {
        if (!departmentStats) return [];
        return departmentStats.map(d => ({
            name: d.department,
            score: Math.round(d.avg_accuracy)
        }));
    }, [departmentStats]);

    const skillStatusData = useMemo(() => {
        if (!departmentStats) return [
            { name: 'Verified', value: 0, fill: '#10b981' },
            { name: 'In Progress', value: 0, fill: '#f59e0b' },
            { name: 'Unverified', value: 0, fill: '#ef4444' }
        ];

        const avgVerifiedRate = departmentStats.reduce((acc, d) => acc + d.verified_skills_rate, 0) / (departmentStats.length || 1);

        return [
            { name: 'Verified', value: Math.round(avgVerifiedRate), fill: '#10b981' },
            { name: 'In Progress', value: Math.round((100 - avgVerifiedRate) * 0.6), fill: '#f59e0b' },
            { name: 'Unverified', value: Math.round((100 - avgVerifiedRate) * 0.4), fill: '#ef4444' }
        ];
    }, [departmentStats]);

    if (isLoadingDept) {
        return <div className="p-8 text-center text-gray-400">Loading dashboard data...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Executive <span className="text-blue-600">Analytics</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg">Monitor institutional skill growth and career readiness across departments</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Faculty</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{metrics.total}</div>
                        <div className="flex items-center text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">
                            <TrendingUp className="h-3 w-3 mr-1" /> ACTIVE GROWTH
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Enrollments</CardTitle>
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{metrics.totalEnrollments}</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Learning Engagement</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Goal Readiness</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{metrics.avgProb}%</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Institutional Probability</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-600 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Verified Skills</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{metrics.verifiedSkills}</div>
                        <div className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-tighter">Quality Assured Matrix</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                {/* Main Charts */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-gray-50 p-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-lg font-black">Departmental Readiness Gap</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Target goal attainment scores by department</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <XAxis
                                            dataKey="name"
                                            fontSize={10}
                                            interval={0}
                                            tickMargin={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#94a3b8', fontWeight: 800 }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${val}%`}
                                            tick={{ fill: '#94a3b8', fontWeight: 800 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc', radius: 8 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const dept = departmentStats?.find(d => d.department === data.name);
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-sm p-4 border-none rounded-2xl shadow-2xl text-sm min-w-[200px]">
                                                            <div className="font-black text-slate-900 mb-2 border-b pb-1 flex justify-between items-center">
                                                                {data.name}
                                                                <Badge className="bg-blue-50 text-blue-600 border-none text-[8px]">{dept?.faculty_count} Faculty</Badge>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-500 font-bold text-[10px] uppercase">Readiness</span>
                                                                    <span className="text-indigo-600 font-black">{data.score}%</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-500 font-bold text-[10px] uppercase">Enrollments</span>
                                                                    <span className="text-slate-900 font-black">{dept?.total_enrollments}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                                            {chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 6]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Analytics - Only Skill Verification Left */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="pb-2 border-b border-gray-50 p-6">
                            <div className="flex items-center gap-2">
                                <PieIcon className="h-5 w-5 text-indigo-500" />
                                <CardTitle className="text-lg font-black">Verification Matrix</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={skillStatusData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        />
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-900">{metrics.total}</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Faculty</span>
                                </div>
                            </div>
                            <div className="space-y-4 mt-6 px-2">
                                {skillStatusData.map(item => (
                                    <div key={item.name} className="flex items-center justify-between text-[10px] font-bold">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                            <span className="uppercase tracking-widest">{item.name}</span>
                                        </div>
                                        <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
