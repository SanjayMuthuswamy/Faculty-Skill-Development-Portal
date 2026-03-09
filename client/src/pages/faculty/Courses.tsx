import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { coursesApi, Course, CourseEnrollment } from '../../lib/api/courses';
import {
    BookOpen,
    Clock,
    Users,
    Search,
    Filter,
    Sparkles,
    ChevronRight,
    BookMarked
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

const LEVEL_COLORS: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    intermediate: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    advanced: 'bg-rose-100 text-rose-700 border-rose-200',
};

// ── COMPONENTS ──────────────────────────────────────────────────────────────

function EnrolledCourseCard({ course, navigate }: { course: Course; navigate: (path: string) => void }) {
    const { data: progress } = useQuery({
        queryKey: ['course-progress', course.id],
        queryFn: () => coursesApi.getCourseProgress(course.id),
    });

    const pct = progress?.progress_pct ?? 0;

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-2xl transition-all duration-300 group flex flex-col">
            <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                    <Badge className={cn("font-semibold h-6 px-2 rounded-lg border shadow-sm uppercase tracking-widest text-[8px]", LEVEL_COLORS[course.skill_level])}>
                        {course.skill_level}
                    </Badge>
                    <Badge className="bg-emerald-500 text-white font-semibold border-none h-6 px-2 rounded-lg text-[8px] uppercase tracking-widest">
                        {pct === 100 ? 'COMPLETED' : 'IN PROGRESS'}
                    </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{course.title}</h3>

                <div className="mt-4 mb-6">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                        <span>Progress</span>
                        <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                <Button
                    onClick={() => navigate(`/faculty/courses/${course.id}`)}
                    className="w-full h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
                >
                    {pct === 100 ? 'REVIEW COURSE' : 'CONTINUE LEARNING'}
                </Button>
            </div>
        </div>
    );
}

export default function CoursesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const { data: courses = [], isLoading, error } = useQuery({
        queryKey: ['courses'],
        queryFn: coursesApi.listCourses,
    });

    if (error) {
        console.error('Courses fetch error:', error);
    }

    const { data: enrollments = [] } = useQuery({
        queryKey: ['course-enrollments'],
        queryFn: coursesApi.getMyEnrollments,
    });

    const enrolledIds = new Set(enrollments.map((e: CourseEnrollment) => e.course_id));

    const enrollMutation = useMutation({
        mutationFn: (courseId: string) => coursesApi.enrollInCourse(courseId),
        onSuccess: (_, courseId) => {
            queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
            queryClient.invalidateQueries({ queryKey: ['my-course-enrollments'] });
            navigate(`/faculty/courses/${courseId}`);
        },
        onError: (error: any) => {
            const detail = error?.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : 'Failed to enroll in course';
            addToast(message, 'error');
        }
    });

    const categories = useMemo(() => {
        const cats = new Set(['All']);
        courses.forEach(c => c.tags?.forEach(t => cats.add(t)));
        return Array.from(cats);
    }, [courses]);

    const filteredCourses = courses.filter((c: Course) => {
        const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(search.toLowerCase());
        const matchLevel = !levelFilter || c.skill_level === levelFilter;
        const matchCategory = activeCategory === 'All' || c.tags?.includes(activeCategory);
        return matchSearch && matchLevel && matchCategory;
    });

    // Mock AI Recommendations logic - based on department or simply promoting newer courses
    const recommendedCourses = useMemo(() => {
        return courses
            .filter(c => !enrolledIds.has(c.id))
            .slice(0, 3);
    }, [courses, enrolledIds]);

    // Sections logic
    const enrolledCourses = courses.filter(c => enrolledIds.has(c.id));
    const availableCourses = filteredCourses.filter(c => !enrolledIds.has(c.id));

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="h-12 w-12 rounded-2xl border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase">Curating your catalog...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-8">

            {/* ── ENROLLED COURSES (Only if any) ────────────────────────── */}
            {enrolledCourses.length > 0 && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            My Learning Journey
                        </h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledCourses.map((course) => (
                            <EnrolledCourseCard key={course.id} course={course} navigate={navigate} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── AI RECOMMENDATIONS ──────────────────────────────────── */}
            {recommendedCourses.length > 0 && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            Recommended for {user?.name.split(' ')[0]}
                        </h2>
                        <Button
                            variant="ghost"
                            className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl gap-2"
                            onClick={() => {
                                setSearch('');
                                setLevelFilter('');
                                setActiveCategory('All');
                                document.getElementById('available-courses')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            VIEW ALL SUGGESTIONS <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {recommendedCourses.map((course) => (
                            <div
                                key={course.id}
                                className="group relative rounded-[32px] overflow-hidden bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 hover:-translate-y-1"
                            >
                                <div className="h-44 bg-slate-900 relative overflow-hidden">
                                    {course.thumbnail_url ? (
                                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 flex items-center justify-center">
                                            <BookMarked className="h-16 w-16 text-white/10" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <Badge className={cn("font-semibold h-7 px-3 rounded-lg border shadow-sm uppercase tracking-widest text-[9px]", LEVEL_COLORS[course.skill_level])}>
                                            {course.skill_level}
                                        </Badge>
                                        <Badge className="bg-indigo-600 text-white font-semibold border-none h-7 px-3 rounded-lg shadow-lg shadow-indigo-600/20 tracking-widest text-[9px]">
                                            AI PICK
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-base font-bold text-slate-900 mb-2 truncate leading-tight group-hover:text-indigo-600 transition-colors">{course.title}</h3>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                            <Clock className="h-3.5 w-3.5" /> {course.duration_hours}H
                                        </div>
                                        <div className="h-1 w-1 rounded-full bg-slate-200" />
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                            <Users className="h-3.5 w-3.5" /> {course.module_count} MODS
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => enrollMutation.mutate(course.id)}
                                        disabled={enrollMutation.isPending}
                                        className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                                    >
                                        {enrollMutation.isPending ? "ENROLLING..." : "ENROLL NOW"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CONTROLS & CATALOG ──────────────────────────────────── */}
            <div className="space-y-8" id="available-courses">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-slate-100">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Available Courses</h2>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search our curriculum..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
                            />
                        </div>
                        <div className="relative w-44">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all capitalize"
                            >
                                <option value="">All levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Categories Flow */}
                <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 10).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300 border-2",
                                activeCategory === cat
                                    ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20"
                                    : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Main Course Grid */}
                {availableCourses.length === 0 ? (
                    <div className="py-32 text-center rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200">
                        <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No courses available at the moment</h3>
                        <p className="text-slate-500 font-medium">Try broadening your search or resetting categories.</p>
                        <Button variant="ghost" className="mt-6 text-blue-600 font-bold h-12 px-8 rounded-xl" onClick={() => { setSearch(''); setActiveCategory('All'); setLevelFilter('') }}>
                            RESET FILTERS
                        </Button>
                    </div>
                ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm mt-6">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                <TableRow>
                                    <TableHead className="py-4 font-bold text-slate-700 w-[400px]">Course Name</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-700">Skill Level</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-700">Duration</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-700">Modules</TableHead>
                                    <TableHead className="py-4 font-bold text-slate-700 text-right">Enroll</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableCourses.map((course: Course) => (
                                    <TableRow key={course.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                {course.thumbnail_url ? (
                                                    <img src={course.thumbnail_url} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                                                        <BookMarked className="h-5 w-5 text-slate-300" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{course.title}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{course.description}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("font-semibold uppercase tracking-widest text-[9px] px-2 h-6 shadow-sm border-none", LEVEL_COLORS[course.skill_level])}>
                                                {course.skill_level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                <Clock className="h-3.5 w-3.5 text-slate-400" /> {course.duration_hours}H
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                <Users className="h-3.5 w-3.5 text-slate-400" /> {course.module_count} MODS
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                onClick={() => enrollMutation.mutate(course.id)}
                                                disabled={enrollMutation.isPending}
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl border-slate-200 text-slate-900 font-bold hover:bg-slate-50 hover:border-slate-300 w-28"
                                            >
                                                {enrollMutation.isPending ? "WAIT..." : "ENROLL NOW"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
