import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { attemptsApi } from '../../lib/api/attempts';
import { programsApi, EnrollmentStatus } from '../../lib/api/programs';
import { facultyApi, SkillStatus } from '../../lib/api/faculty';
import { growthPlansApi } from '../../lib/api/growthPlans';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export default function FacultyDashboard() {
    const { user } = useAuth();

    const { data: enrollments } = useQuery({
        queryKey: ['enrollments', user?.id],
        queryFn: enrollmentsApi.getMyEnrollments,
        enabled: !!user,
    });

    const { data: attempts } = useQuery({
        queryKey: ['attempts', user?.id],
        queryFn: attemptsApi.getMyAttempts,
        enabled: !!user,
    });

    const { data: programs } = useQuery({
        queryKey: ['programs'],
        queryFn: () => programsApi.listPrograms(),
    });

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: facultyApi.getMe,
        enabled: !!user,
    });

    const { data: growthPlan } = useQuery({
        queryKey: ['growth-plan', user?.id],
        queryFn: growthPlansApi.getMyActivePlan,
        enabled: !!user,
    });

    const completedPrograms = enrollments?.filter(e => e.status === EnrollmentStatus.COMPLETED).length || 0;
    const activePrograms = enrollments?.filter(e => e.status === EnrollmentStatus.ENROLLED || e.status === EnrollmentStatus.IN_PROGRESS).length || 0;

    const avgScore = attempts && attempts.length > 0
        ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length)
        : 0;

    const verifiedSkillsCount = profile?.skills?.filter(s => s.status === SkillStatus.VERIFIED).length || 0;
    const inProgressSkillsCount = profile?.skills?.filter(s => s.status === SkillStatus.PENDING || s.status === SkillStatus.UNVERIFIED).length || 0;

    const upcomingPrograms = programs?.filter(p => p.start_date && new Date(p.start_date) > new Date()).slice(0, 3) || [];

    const chartData = attempts?.map(a => ({
        name: format(new Date(a.completed_at), 'MMM d'),
        score: a.score
    })).slice(-5) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Dashboard Overview</h1>
                    <p className="text-slate-500 font-medium">Welcome back, <span className="text-blue-600">{user?.name}</span></p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled Programs</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activePrograms}</div>
                        <p className="text-xs text-gray-500">{completedPrograms} completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgScore}%</div>
                        <p className="text-xs text-gray-500">Across all attempts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Verified Skills</CardTitle>
                        <CheckCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{verifiedSkillsCount}</div>
                        <p className="text-xs text-gray-500">{inProgressSkillsCount} in progress</p>
                    </CardContent>
                </Card>
                <Card className={cn(growthPlan ? "border-primary" : "")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Growth Plan</CardTitle>
                        <Clock className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {growthPlan ? `${growthPlan.progress_percentage}%` : "No Plan"}
                        </div>
                        <p className="text-xs text-gray-500">
                            {growthPlan ? `${growthPlan.weeks.filter(w => w.completed).length} weeks done` : "Start setup now"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-400">
                                    No test data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Upcoming Programs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingPrograms.map(program => (
                                <div key={program.id} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{program.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {program.start_date ? format(new Date(program.start_date), 'MMM d, yyyy') : 'TBD'} • {program.domain}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {program.duration}
                                    </div>
                                </div>
                            ))}
                            {upcomingPrograms.length === 0 && <p className="text-sm text-gray-500">No upcoming programs</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
