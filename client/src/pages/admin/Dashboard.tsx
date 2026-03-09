import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analytics';
import { facultyApi } from '../../lib/api/faculty';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import {
    Users,
    TrendingUp,
    BrainCircuit,
    Search,
    ShieldCheck,
    ChevronRight,
    BookOpen,
    BarChart3,
    PieChart as PieIcon,
    Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const { data: departmentStats, isLoading: isLoadingDept } = useQuery({
        queryKey: ['admin-dept-summary'],
        queryFn: analyticsApi.getDepartmentSummary,
    });

    const { data: facultyProfiles, isLoading: isLoadingFaculty } = useQuery({
        queryKey: ['admin-faculty-list'],
        queryFn: () => facultyApi.listProfiles(),
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

    const filteredFaculty = useMemo(() => {
        if (!facultyProfiles) return [];
        return facultyProfiles.filter(f =>
            (f.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.department || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [facultyProfiles, searchQuery]);

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

    if (isLoadingDept || isLoadingFaculty) {
        return <div className="p-8 text-center text-gray-400">Loading dashboard data...</div>;
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
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
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#94a3b8', fontWeight: 800 }}
                                        />
                                        <YAxis
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

                    {/* Faculty Risk Tracking */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 p-6">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-rose-500" />
                                <div>
                                    <CardTitle className="text-lg font-black">AI-Driven Risk Matrix</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Faculty identified by engagement patterns</CardDescription>
                                </div>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input
                                    className="pl-9 h-10 w-64 rounded-xl border border-gray-100 bg-gray-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all"
                                    placeholder="Search by name or department..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="border-t">
                                {isLoadingFaculty ? (
                                    <div className="p-8 text-center text-gray-400">Loading risk data...</div>
                                ) : filteredFaculty?.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No faculty found</div>
                                ) : filteredFaculty?.map((f) => {
                                    return (
                                        <div key={f.id} className="flex items-center px-6 py-4 border-b last:border-0 hover:bg-gray-50/80 transition-colors group">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-xs shadow-sm group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white transition-all">
                                                        {f.user?.name?.charAt(0) || 'F'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{f.user?.name || 'Unknown'}</span>
                                                            <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] uppercase font-black tracking-tight">{f.department}</Badge>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3 mt-1 text-[9px] font-bold text-slate-400">
                                                            <span className="uppercase tracking-widest">{f.designation || 'Faculty'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300 self-center" />
                                                            <span className="uppercase tracking-widest">{f.experience_years} Years Exp</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3 ml-4">
                                                <div className="text-right">
                                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</div>
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase tracking-tight h-5">
                                                        Active
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg group/btn"
                                                    onClick={() => navigate(`/admin/faculty/${f.id}`)}
                                                >
                                                    Review <ChevronRight className="ml-1 h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
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
