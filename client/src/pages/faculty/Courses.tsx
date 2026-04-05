import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { coursesApi, Course, CourseEnrollment } from '../../lib/api/courses';
import { facultyApi } from '../../lib/api/faculty';
import {
    BookMarked,
    BookOpen,
    Check,
    ChevronRight,
    ChevronDown,
    Clock,
    Filter,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { LoadingState } from '../../components/ui/LoadingState';
import { getCourseThumbnailUrl } from '../../lib/utils/courseThumbnails';

const LEVEL_COLORS: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    intermediate: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    advanced: 'bg-rose-100 text-rose-700 border-rose-200',
};

const CATEGORY_SECTIONS: Array<{ label: string; tags: string[] }> = [
    { label: 'AI And Digital Skills', tags: ['AI', 'Generative AI', 'Prompt Engineering', 'Digital', 'Data', 'Visualization', 'Data Literacy', 'Analytics', 'Intermediate Learning Analytics'] },
    { label: 'Teaching And Curriculum', tags: ['Education', 'Teaching', 'Curriculum', 'Planning', 'LMS', 'Blended', 'OBE', 'Presentation'] },
    { label: 'Assessment And Quality', tags: ['Assessment', 'Evaluation', 'Rubrics', 'Feedback', 'Testing'] },
    { label: 'Technology And Engineering', tags: ['Software Engineering', 'Git', 'DevOps', 'Networking', 'TCP/IP', 'Network Security'] },
    { label: 'Research And Publications', tags: ['Research', 'Writing', 'Publication', 'Projects', 'Innovation'] },
    { label: 'Leadership And Administration', tags: ['Leadership', 'Coordination', 'Administration', 'Strategy', 'Capstone', 'Productivity'] },
    { label: 'Student Success And Inclusion', tags: ['Mentoring', 'Students', 'Student Support', 'Advising', 'Wellbeing', 'Inclusion', 'Accessibility', 'Communication', 'Industry', 'Employability'] },
    { label: 'Levels', tags: ['Beginner', 'Intermediate', 'Advanced'] },
];

const RECOMMENDATION_REASON_STYLES: Record<string, string> = {
    'Skill Match': 'bg-indigo-600 text-white shadow-indigo-600/20',
    'Department Fit': 'bg-emerald-600 text-white shadow-emerald-600/20',
    'Next Step': 'bg-amber-500 text-white shadow-amber-500/20',
    'Popular Pick': 'bg-slate-900 text-white shadow-slate-900/20',
};

type CourseCardProps = {
    course: Course;
    actionLabel: string;
    onAction: () => void;
    actionVariant?: 'primary' | 'dark';
    progressPct?: number;
    statusLabel?: string;
    accentLabel?: string;
    accentTone?: 'violet' | 'amber';
    accentClassName?: string;
};

function CourseCard({
    course,
    actionLabel,
    onAction,
    actionVariant = 'primary',
    progressPct,
    statusLabel,
    accentLabel,
    accentTone = 'violet',
    accentClassName,
}: CourseCardProps) {
    const navigate = useNavigate();
    const thumbnailUrl = getCourseThumbnailUrl(course);
    const resolvedAccentClassName = accentClassName ?? (accentTone === 'amber'
        ? 'bg-amber-500 text-white shadow-amber-500/20'
        : 'bg-indigo-600 text-white shadow-indigo-600/20');
    const buttonClassName = actionVariant === 'dark'
        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10';

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-lg shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="relative h-44 overflow-hidden bg-slate-950">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={course.title}
                        className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900">
                        <BookMarked className="h-16 w-16 text-white/10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <Badge className={cn('h-7 rounded-lg border px-3 text-[9px] font-semibold uppercase tracking-widest shadow-sm', LEVEL_COLORS[course.skill_level])}>
                        {course.skill_level}
                    </Badge>
                    {statusLabel ? (
                        <Badge className="h-7 rounded-lg border-none bg-emerald-500 px-3 text-[9px] font-semibold uppercase tracking-widest text-white">
                            {statusLabel}
                        </Badge>
                    ) : null}
                    {accentLabel ? (
                        <Badge className={cn('h-7 rounded-lg border-none px-3 text-[9px] font-semibold uppercase tracking-widest text-white shadow-lg', resolvedAccentClassName)}>
                            {accentLabel}
                        </Badge>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => navigate(`/faculty/courses/${course.id}`)}
                    className="absolute inset-0"
                    aria-label={`Open ${course.title}`}
                />
            </div>

            <div className="flex flex-1 flex-col p-6">
                <h3 className="line-clamp-2 text-lg font-bold uppercase tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
                    {course.title}
                </h3>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                    {course.description || 'Practical faculty-focused learning designed to build stronger teaching workflows.'}
                </p>

                <div className="mt-5 flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {course.duration_hours}H
                    </div>
                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {course.module_count} MODS
                    </div>
                </div>

                {typeof progressPct === 'number' ? (
                    <div className="mt-5">
                        <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase text-slate-400">
                            <span>Progress</span>
                            <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                ) : null}

                <Button
                    onClick={onAction}
                    className={cn('mt-6 h-12 w-full rounded-2xl font-bold transition-all shadow-lg', buttonClassName)}
                >
                    {actionLabel}
                </Button>
            </div>
        </article>
    );
}

function LearningJourneyCard({
    course,
    enrollment,
}: {
    course: Course;
    enrollment?: CourseEnrollment;
}) {
    const navigate = useNavigate();
    const isCompleted = Boolean(enrollment?.completed_at);
    const { data: progress } = useQuery({
        queryKey: ['course-progress', course.id],
        queryFn: () => coursesApi.getCourseProgress(course.id),
        enabled: !isCompleted,
    });

    const progressPct = isCompleted ? 100 : Math.max(0, Math.round(progress?.progress_pct ?? 0));

    return (
        <CourseCard
            course={course}
            progressPct={progressPct}
            statusLabel={isCompleted ? 'Completed' : 'In Progress'}
            actionLabel={isCompleted ? 'REVIEW COURSE' : 'CONTINUE LEARNING'}
            onAction={() => navigate(`/faculty/courses/${course.id}`)}
        />
    );
}

function CategoryDropdown({
    value,
    sections,
    onChange,
}: {
    value: string;
    sections: Array<{ label: string; options: string[] }>;
    onChange: (value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative md:w-72">
            <BookMarked className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
            >
                <span className="truncate">{value === 'All' ? 'All categories' : value}</span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen ? (
                <>
                    <button
                        type="button"
                        aria-label="Close category menu"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/30">
                        <div className="max-h-[24rem] overflow-y-auto p-3">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('All');
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all',
                                    value === 'All'
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-700 hover:bg-slate-50'
                                )}
                            >
                                <span>All categories</span>
                                {value === 'All' ? <Check className="h-4 w-4" /> : null}
                            </button>

                            {sections.map((section) => (
                                <div key={section.label} className="mt-3 rounded-2xl bg-slate-50/80 p-2">
                                    <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                        {section.label}
                                    </p>
                                    <div className="space-y-1">
                                        {section.options.map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                    onChange(option);
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                                                    value === option
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                        : 'text-slate-700 hover:bg-white hover:shadow-sm'
                                                )}
                                            >
                                                <span className="truncate">{option}</span>
                                                {value === option ? <Check className="h-4 w-4" /> : null}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : null}
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
    const [journeyFilter, setJourneyFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
    const [availableCoursesPage, setAvailableCoursesPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search, 300);
    const ITEMS_PER_PAGE = 9;

    const { data: courses = [], isLoading, error } = useQuery({
        queryKey: ['courses', 'catalog'],
        queryFn: coursesApi.listCourses,
    });

    const { data: profile } = useQuery({
        queryKey: ['faculty-profile-me'],
        queryFn: facultyApi.getMe,
        enabled: !!user,
    });

    if (error) {
        console.error('Courses fetch error:', error);
    }

    const { data: enrollments = [] } = useQuery({
        queryKey: ['course-enrollments'],
        queryFn: coursesApi.getMyEnrollments,
    });

    const enrolledIds = useMemo(
        () => new Set(enrollments.map((enrollment: CourseEnrollment) => enrollment.course_id)),
        [enrollments]
    );

    const enrollmentByCourseId = useMemo(() => {
        const map = new Map<string, CourseEnrollment>();
        enrollments.forEach((enrollment: CourseEnrollment) => {
            map.set(enrollment.course_id, enrollment);
        });
        return map;
    }, [enrollments]);

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

    const enrolledCourses = useMemo(() => {
        const enrolledFromCatalog = courses.filter((course) => enrolledIds.has(course.id));
        const enrichedFromEnrollments = enrollments
            .map((enrollment: CourseEnrollment) => enrollment.course)
            .filter((course): course is Course => Boolean(course));
        const byId = new Map<string, Course>();

        [...enrichedFromEnrollments, ...enrolledFromCatalog].forEach((course) => {
            byId.set(course.id, course);
        });

        return Array.from(byId.values());
    }, [courses, enrollments, enrolledIds]);

    const catalogCourses = useMemo(() => {
        const byId = new Map<string, Course>();
        courses.forEach((course) => byId.set(course.id, course));
        enrolledCourses.forEach((course) => {
            if (!byId.has(course.id)) {
                byId.set(course.id, course);
            }
        });
        return Array.from(byId.values());
    }, [courses, enrolledCourses]);

    const categories = useMemo(() => {
        const cats = new Set<string>(['All']);
        catalogCourses.forEach((course) => course.tags?.forEach((tag) => cats.add(tag)));
        return Array.from(cats);
    }, [catalogCourses]);

    const categorySections = useMemo(() => {
        const availableCategories = new Set(categories.filter((category) => category !== 'All'));
        const matched = new Set<string>();

        const grouped = CATEGORY_SECTIONS.map((section) => {
            const options = section.tags.filter((tag) => availableCategories.has(tag));
            options.forEach((tag) => matched.add(tag));
            return {
                label: section.label,
                options,
            };
        }).filter((section) => section.options.length > 0);

        const uncategorized = Array.from(availableCategories)
            .filter((category) => !matched.has(category))
            .sort((a, b) => a.localeCompare(b));

        if (uncategorized.length > 0) {
            grouped.push({
                label: 'More Topics',
                options: uncategorized,
            });
        }

        return grouped;
    }, [categories]);

    const filteredCourses = useMemo(() => {
        return catalogCourses.filter((course: Course) => {
            const matchSearch = !debouncedSearch
                || course.title.toLowerCase().includes(debouncedSearch.toLowerCase())
                || (course.description || '').toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchLevel = !levelFilter || course.skill_level === levelFilter;
            const matchCategory = activeCategory === 'All' || course.tags?.includes(activeCategory);

            return matchSearch && matchLevel && matchCategory;
        });
    }, [catalogCourses, debouncedSearch, levelFilter, activeCategory]);

    const recommendedCourses = useMemo(() => {
        const normalize = (value: string) => value.trim().toLowerCase();
        const departmentTerms = (profile?.department || '')
            .split(/[\s/&,-]+/)
            .map(normalize)
            .filter((term) => term.length > 2);
        const skillTerms = (profile?.skills || [])
            .flatMap((entry) => [entry.skill?.name, entry.skill?.domain])
            .filter((value): value is string => Boolean(value))
            .map(normalize);
        const completedCount = enrollments.filter((entry) => Boolean(entry.completed_at)).length;

        return catalogCourses
            .filter((course) => !enrolledIds.has(course.id))
            .map((course) => {
                const haystack = normalize([
                    course.title,
                    course.description || '',
                    ...(course.tags || []),
                ].join(' '));

                const tagMatches = (course.tags || []).filter((tag) =>
                    skillTerms.some((term) => normalize(tag).includes(term) || term.includes(normalize(tag)))
                );
                const skillMatchCount = skillTerms.filter((term) => haystack.includes(term)).length;
                const departmentMatch = departmentTerms.some((term) => haystack.includes(term));

                let score = 0;
                let reason = 'Popular Pick';

                if (skillMatchCount > 0 || tagMatches.length > 0) {
                    score += 8 + tagMatches.length + skillMatchCount;
                    reason = 'Skill Match';
                }
                if (departmentMatch) {
                    score += 5;
                    reason = reason === 'Skill Match' ? reason : 'Department Fit';
                }
                if (
                    (completedCount === 0 && course.skill_level === 'beginner')
                    || (completedCount >= 1 && completedCount < 3 && course.skill_level === 'intermediate')
                    || (completedCount >= 3 && course.skill_level === 'advanced')
                ) {
                    score += 4;
                    if (reason === 'Popular Pick') {
                        reason = 'Next Step';
                    }
                }

                score += Math.max(1, course.module_count || 0) * 0.1;

                return { course, score, reason };
            })
            .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
            .slice(0, 3);
    }, [catalogCourses, enrolledIds, profile, enrollments]);

    const journeyCourses = useMemo(() => {
        if (journeyFilter === 'all') return enrolledCourses;

        return enrolledCourses.filter((course) => {
            const isCompleted = Boolean(enrollmentByCourseId.get(course.id)?.completed_at);
            return journeyFilter === 'completed' ? isCompleted : !isCompleted;
        });
    }, [enrolledCourses, journeyFilter, enrollmentByCourseId]);

    const availableCourses = useMemo(
        () => filteredCourses.filter((course) => !enrolledIds.has(course.id)),
        [filteredCourses, enrolledIds]
    );

    const hasAnyCourses = catalogCourses.length > 0;
    const availableCoursesTotalPages = Math.max(1, Math.ceil(availableCourses.length / ITEMS_PER_PAGE));
    const pagedAvailableCourses = availableCourses.slice(
        (availableCoursesPage - 1) * ITEMS_PER_PAGE,
        availableCoursesPage * ITEMS_PER_PAGE
    );

    const journeyCounts = useMemo(() => {
        const completed = enrolledCourses.filter((course) => enrollmentByCourseId.get(course.id)?.completed_at).length;
        return {
            all: enrolledCourses.length,
            completed,
            inProgress: enrolledCourses.length - completed,
        };
    }, [enrolledCourses, enrollmentByCourseId]);

    if (isLoading) return <LoadingState label="Curating your catalog" />;

    return (
        <div className="mx-auto max-w-7xl space-y-16 pb-20 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Published Courses</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{catalogCourses.length}</p>
                    <p className="mt-2 text-sm text-slate-500">Courses currently visible to faculty.</p>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">My Enrolled</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{enrolledCourses.length}</p>
                    <p className="mt-2 text-sm text-slate-500">Courses already started or assigned to you.</p>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Available Now</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{availableCourses.length}</p>
                    <p className="mt-2 text-sm text-slate-500">Courses ready for new enrollment with current filters.</p>
                </div>
            </div>

            {enrolledCourses.length > 0 && (
                <section className="space-y-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            My Learning Journey
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setJourneyFilter('all')}
                                className={cn(
                                    'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all',
                                    journeyFilter === 'all'
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                )}
                            >
                                All {journeyCounts.all}
                            </button>
                            <button
                                type="button"
                                onClick={() => setJourneyFilter('in-progress')}
                                className={cn(
                                    'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all',
                                    journeyFilter === 'in-progress'
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                )}
                            >
                                In Progress {journeyCounts.inProgress}
                            </button>
                            <button
                                type="button"
                                onClick={() => setJourneyFilter('completed')}
                                className={cn(
                                    'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all',
                                    journeyFilter === 'completed'
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                )}
                            >
                                Completed {journeyCounts.completed}
                            </button>
                        </div>
                    </div>

                    {journeyCourses.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {journeyCourses.map((course) => (
                                <LearningJourneyCard
                                    key={course.id}
                                    course={course}
                                    enrollment={enrollmentByCourseId.get(course.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                            <p className="text-sm font-medium text-slate-500">No courses match this learning status.</p>
                        </div>
                    )}
                </section>
            )}

            {recommendedCourses.length > 0 && (
                <section className="space-y-8">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            Recommended for {user?.name.split(' ')[0]}
                        </h2>
                        <Button
                            variant="ghost"
                            className="gap-2 rounded-xl font-bold text-indigo-600 hover:bg-indigo-50"
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

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {recommendedCourses.map(({ course, reason }) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                accentLabel={reason}
                                accentClassName={RECOMMENDATION_REASON_STYLES[reason] || RECOMMENDATION_REASON_STYLES['Popular Pick']}
                                actionLabel={enrollMutation.isPending ? 'ENROLLING...' : 'ENROLL NOW'}
                                actionVariant="dark"
                                onAction={() => enrollMutation.mutate(course.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-8" id="available-courses">
                <div className="flex flex-col gap-6 border-b border-slate-100 pb-2 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Available Courses</h2>
                    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                        <div className="group relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                            <input
                                type="text"
                                placeholder="Search our curriculum..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setAvailableCoursesPage(1);
                                }}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <CategoryDropdown
                            value={activeCategory}
                            sections={categorySections}
                            onChange={(value) => {
                                setActiveCategory(value);
                                setAvailableCoursesPage(1);
                            }}
                        />
                        <div className="relative md:w-44">
                            <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={levelFilter}
                                onChange={(event) => {
                                    setLevelFilter(event.target.value);
                                    setAvailableCoursesPage(1);
                                }}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold capitalize transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
                            >
                                <option value="">All levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Active Filters</span>
                    <Badge className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                        {activeCategory === 'All' ? 'All Categories' : activeCategory}
                    </Badge>
                    <Badge className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                        {levelFilter || 'All Levels'}
                    </Badge>
                </div>

                {!hasAnyCourses ? (
                    <div className="rounded-[40px] border-2 border-dashed border-slate-200 bg-slate-50 py-32 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
                            <BookOpen className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No published courses are available yet</h3>
                        <p className="text-slate-500 font-medium">Check back after an admin publishes courses for faculty.</p>
                    </div>
                ) : availableCourses.length === 0 ? (
                    <div className="rounded-[40px] border-2 border-dashed border-slate-200 bg-slate-50 py-32 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200">
                            <BookOpen className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {enrolledCourses.length > 0 ? 'No additional courses match these filters' : 'No courses match your current filters'}
                        </h3>
                        <p className="font-medium text-slate-500">
                            {enrolledCourses.length > 0
                                ? 'Your enrolled courses are shown above. Reset filters to explore the full catalog.'
                                : 'Try broadening your search or resetting categories.'}
                        </p>
                        <Button
                            variant="ghost"
                            className="mt-6 h-12 rounded-xl px-8 font-bold text-blue-600"
                            onClick={() => {
                                setSearch('');
                                setActiveCategory('All');
                                setLevelFilter('');
                                setAvailableCoursesPage(1);
                            }}
                        >
                            RESET FILTERS
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pagedAvailableCourses.map((course: Course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                accentLabel={course.tags?.[0]}
                                accentTone="amber"
                                actionLabel={enrollMutation.isPending ? 'ENROLLING...' : 'ENROLL NOW'}
                                onAction={() => enrollMutation.mutate(course.id)}
                            />
                        ))}
                    </div>
                )}

                {availableCourses.length > ITEMS_PER_PAGE && (
                    <Pagination
                        currentPage={availableCoursesPage}
                        totalPages={availableCoursesTotalPages}
                        onPageChange={setAvailableCoursesPage}
                        className="pt-0"
                    />
                )}
            </section>
        </div>
    );
}
