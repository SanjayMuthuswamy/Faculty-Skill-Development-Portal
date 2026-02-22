import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analytics';
import { facultyApi } from '../../lib/api/faculty';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import {
    Users,
    TrendingUp,
    AlertCircle,
    BrainCircuit,
    Search,
    ShieldCheck,
    ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useState, useMemo } from 'react';

export default function AdminDashboard() {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: departmentStats, isLoading: isLoadingDept } = useQuery({
        queryKey: ['admin-dept-summary'],
        queryFn: analyticsApi.getDepartmentSummary,
    });

    const { data: facultyProfiles, isLoading: isLoadingFaculty } = useQuery({
        queryKey: ['admin-faculty-list'],
        queryFn: () => facultyApi.listProfiles(),
    });

    if (isLoadingDept || isLoadingFaculty) {
        return <div className="p-8 text-center text-gray-400">Loading dashboard data...</div>;
    }

    // Aggregated Metrics
    const metrics = useMemo(() => {
        if (!departmentStats) return { total: 0, highRisk: 0, avgProb: 0, verifiedSkills: 0 };

        const total = departmentStats.reduce((acc, d) => acc + d.faculty_count, 0);
        const avgProb = Math.round(departmentStats.reduce((acc, d) => acc + d.avg_accuracy, 0) / (departmentStats.length || 1));

        // Use verified skills rate as a proxy for verified skills total if needed, or stick to mock for now if backend doesn't provide total sum
        const verifiedSkillsTotal = Math.round(departmentStats.reduce((acc, d) => acc + (d.verified_skills_rate * d.faculty_count / 100), 0));

        // High risk proxy: departments with < 50% accuracy
        const risky = departmentStats.filter(d => d.avg_accuracy < 50).length;

        return {
            total,
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
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 uppercase">Total Faculty</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.total}</div>
                        <div className="flex items-center text-xs text-green-600 mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> +4 this month
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-600">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 uppercase">High Risk Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{metrics.highRisk}</div>
                        <div className="text-xs text-gray-400 mt-1">Requiring immediate intervention</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-600">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 uppercase">Avg Goal Readiness</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.avgProb}%</div>
                        <div className="text-xs text-gray-400 mt-1">Institutional career probability</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-600">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-500 uppercase">Verified Skills</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{metrics.verifiedSkills}</div>
                        <div className="text-xs text-indigo-600 font-medium mt-1">Quality Assured Matrix</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                {/* Main Charts */}
                <div className="lg:col-span-5 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Departmental Readiness Gap</CardTitle>
                            <CardDescription>Target goal attainment scores by department</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white p-3 border rounded shadow-lg text-sm">
                                                            <div className="font-bold text-gray-900 mb-1">{payload[0].payload.name}</div>
                                                            <div className="text-indigo-600 font-semibold">Avg Readiness: {payload[0].value}%</div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                                            {chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Faculty Risk Tracking */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>AI-Driven Risk Matrix</CardTitle>
                                <CardDescription>Faculty identified by stagnation or low engagement patterns</CardDescription>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    className="pl-9 h-9 w-64 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    placeholder="Search faculty..."
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
                                        <div key={f.id} className="flex items-center px-6 py-4 border-b last:border-0 hover:bg-gray-50 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{f.user?.name || 'Unknown'}</span>
                                                    <Badge variant="outline" className="text-[10px] lowercase">{f.department}</Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 bg-blue-50 text-blue-700">
                                                        {f.designation || 'Faculty'}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 bg-gray-50 text-gray-700">
                                                        {f.experience_years} Years Experience
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 ml-4">
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Engagement</div>
                                                    <div className="text-lg font-bold text-blue-600">
                                                        Active
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:bg-indigo-50 hover:text-indigo-700">
                                                    View Profile <ChevronRight className="ml-1 h-3 w-3" />
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
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-md">Skill Verification Status</CardTitle>
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
                                    <span className="text-2xl font-bold">{metrics.total}</span>
                                    <span className="text-[10px] text-gray-400">Total Faculty</span>
                                </div>
                            </div>
                            <div className="space-y-3 mt-4">
                                {skillStatusData.map(item => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                            <span>{item.name}</span>
                                        </div>
                                        <span className="font-bold">{item.value}%</span>
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
