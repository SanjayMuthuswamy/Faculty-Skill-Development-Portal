import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { attemptsApi } from '../../lib/api/attempts';
import { programsApi, EnrollmentStatus } from '../../lib/api/programs';
import { facultyApi, SkillStatus } from '../../lib/api/faculty';
import { growthPlansApi } from '../../lib/api/growthPlans';
import { coursesApi } from '../../lib/api/courses';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen, CheckCircle, TrendingUp, Clock, PlayCircle, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek } from 'date-fns';
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

    const { data: myCourseEnrollments } = useQuery({
        queryKey: ['my-course-enrollments'],
        queryFn: coursesApi.getMyEnrollments,
        enabled: !!user,
    });

    const { data: allCourses } = useQuery({
        queryKey: ['all-courses'],
        queryFn: coursesApi.listCourses,
    });

    const completedPrograms = enrollments?.filter(e => e.status === EnrollmentStatus.COMPLETED).length || 0;
    // BUG-FIX: EnrollmentStatus.IN_PROGRESS does not exist; the enum only has ENROLLED/CANCELLED/COMPLETED/DROPPED
    const activePrograms = enrollments?.filter(e => e.status === EnrollmentStatus.ENROLLED).length || 0;

    // BUG-FIX: `score` is a raw correct-answer count; `accuracy` is the percentage — use accuracy for display
    const avgScore = attempts && attempts.length > 0
        ? Math.round(attempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / attempts.length)
        : 0;

    const verifiedSkillsCount = profile?.skills?.filter(s => s.status === SkillStatus.VERIFIED).length || 0;
    const inProgressSkillsCount = profile?.skills?.filter(s => s.status === SkillStatus.PENDING || s.status === SkillStatus.UNVERIFIED).length || 0;

    const upcomingPrograms = programs?.filter(p =>
        p.status === 'UPCOMING' || p.status === 'ONGOING' || p.status === 'PUBLISHED'
    ).slice(0, 3) || [];

    const [performanceView, setPerformanceView] = useState<'daily' | 'weekly'>('daily');

    const chartData = useMemo(() => {
        if (!attempts || attempts.length === 0) return [];

        // Sort attempts by date ascending
        const sortedAttempts = [...attempts].sort((a, b) =>
            new Date(a.submitted_at || a.started_at).getTime() - new Date(b.submitted_at || b.started_at).getTime()
        );

        if (performanceView === 'daily') {
            return sortedAttempts.map(a => ({
                name: format(new Date(a.submitted_at || a.started_at), 'MMM d'),
                score: Math.round(a.accuracy || 0)
            })).slice(-7);
        } else {
            // Weekly grouping
            const weeks: Record<string, { total: number, count: number }> = {};
            sortedAttempts.forEach(a => {
                const date = new Date(a.submitted_at || a.started_at);
                const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d');
                if (!weeks[weekStart]) {
                    weeks[weekStart] = { total: 0, count: 0 };
                }
                weeks[weekStart].total += (a.accuracy || 0);
                weeks[weekStart].count += 1;
            });
            return Object.entries(weeks).map(([name, data]) => ({
                name: `W/O ${name}`,
                score: Math.round(data.total / data.count)
            })).slice(-5);
        }
    }, [attempts, performanceView]);

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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Recent Performance</CardTitle>
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setPerformanceView('daily')}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                                    performanceView === 'daily'
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Daily
                            </button>
                            <button
                                onClick={() => setPerformanceView('weekly')}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                                    performanceView === 'weekly'
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Weekly
                            </button>
                        </div>
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
                        <CardTitle>Recommended Programs</CardTitle>
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
                            {upcomingPrograms.length === 0 && <p className="text-sm text-gray-500">No active or upcoming programs found</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── My Courses ─────────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-800">My Courses</h2>
                        {myCourseEnrollments && <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">{myCourseEnrollments.length}</span>}
                    </div>
                    <a href="/faculty/courses" className="text-xs text-blue-600 font-semibold hover:underline">View All →</a>
                </div>
                {(!myCourseEnrollments || myCourseEnrollments.length === 0) ? (
                    <Card>
                        <CardContent className="flex flex-col items-center py-10 text-slate-400">
                            <BookOpen className="h-8 w-8 mb-2 opacity-30" />
                            <p className="text-sm">You haven't enrolled in any courses yet.</p>
                            <a href="/faculty/courses" className="mt-2 text-xs text-blue-500 hover:underline">Browse courses →</a>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {myCourseEnrollments.slice(0, 3).map(enrollment => {
                            const course = allCourses?.find(c => c.id === enrollment.course_id);
                            if (!course) return null;
                            return (
                                <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="pt-5 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-bold text-slate-800 leading-snug">{course.title}</h4>
                                            {enrollment.completed_at && <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">Done</span>}
                                        </div>
                                        <p className="text-xs text-slate-400">{course.instructor_name} · {course.skill_level}</p>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Progress</span>
                                                <span>{enrollment.completed_at ? '100%' : 'In Progress'}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: enrollment.completed_at ? '100%' : '30%' }} />
                                            </div>
                                        </div>
                                        <a href={`/faculty/courses/${course.id}`}
                                            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                                            <PlayCircle className="h-3.5 w-3.5" />
                                            Continue Learning
                                        </a>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Available Courses ───────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-slate-800">Available Courses</h2>
                    </div>
                    <a href="/faculty/courses" className="text-xs text-blue-600 font-semibold hover:underline">Browse All →</a>
                </div>
                {(!allCourses || allCourses.length === 0) ? (
                    <p className="text-sm text-slate-400">No courses available right now.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {allCourses.filter(c => c.is_published).slice(0, 4).map(course => (
                            <Card key={course.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-400">
                                <CardContent className="pt-4 space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                            ${course.skill_level === 'beginner' ? 'bg-green-100 text-green-700' :
                                                course.skill_level === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {course.skill_level}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{course.title}</h4>
                                    <p className="text-xs text-slate-400">{course.instructor_name}</p>
                                    <a href={`/faculty/courses/${course.id}`}
                                        className="flex items-center justify-center gap-1 text-xs text-blue-600 font-semibold hover:underline pt-1">
                                        View Course →
                                    </a>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
