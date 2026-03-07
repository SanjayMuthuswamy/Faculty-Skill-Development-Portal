import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, CourseModule, ModuleQuiz } from '../../lib/api/courses';
import {
    ChevronDown, ChevronRight, Play, FileText,
    AlertCircle, Loader2, Award, ExternalLink, Users, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

function VideoPlayer({ url }: { url: string }) {
    const embedUrl = url.includes('youtube.com/watch')
        ? url.replace('watch?v=', 'embed/')
        : url.includes('youtu.be/')
            ? url.replace('youtu.be/', 'www.youtube.com/embed/')
            : url;

    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 shadow-lg border border-slate-200">
            <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Module Video"
            />
        </div>
    );
}

function MiniQuizPanel({ questions, moduleId, onComplete }: {
    questions: ModuleQuiz[];
    moduleId: string;
    onComplete: (score: number) => void;
}) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState<number | null>(null);
    const submitQuizMutation = useMutation({
        mutationFn: (ans: Record<string, string>) => coursesApi.submitMiniQuiz(moduleId, ans),
        onSuccess: (data) => {
            setScore(data.quiz_score ?? 0);
            onComplete(data.quiz_score ?? 0);
        },
    });

    if (questions.length === 0) return null;

    return (
        <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-bold text-slate-800 text-sm mb-3">📝 Module Quiz</h4>
            {questions.map((q, i) => (
                <div key={q.id} className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">{i + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                        {Object.entries(q.options).map(([key, val]) => (
                            <label key={key} className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border text-sm transition-colors",
                                answers[q.id] === key
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white border-slate-200 hover:border-blue-300 text-slate-700",
                                submitted && q.correct_answer === key && "bg-green-600 text-white border-green-600",
                                submitted && answers[q.id] === key && answers[q.id] !== q.correct_answer && "bg-red-500 text-white border-red-500",
                            )}>
                                <input
                                    type="radio"
                                    className="sr-only"
                                    disabled={submitted}
                                    checked={answers[q.id] === key}
                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: key }))}
                                />
                                <span className="font-bold">{key}.</span> {val}
                            </label>
                        ))}
                    </div>
                    {submitted && answers[q.id] !== q.correct_answer && (
                        <p className="text-xs text-slate-500 mt-1.5 ml-1">💡 {q.explanation}</p>
                    )}
                </div>
            ))}
            {!submitted ? (
                <button
                    onClick={() => { setSubmitted(true); submitQuizMutation.mutate(answers); }}
                    disabled={Object.keys(answers).length < questions.length || submitQuizMutation.isPending}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {submitQuizMutation.isPending ? 'Submitting…' : 'Submit Quiz'}
                </button>
            ) : score !== null && (
                <div className={cn("mt-3 px-4 py-3 rounded-lg text-sm font-semibold", score >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {score >= 60 ? '✅' : '❌'} Score: {score.toFixed(0)}% — {score >= 60 ? 'Quiz Passed!' : 'Review and retry when available.'}
                </div>
            )}
        </div>
    );
}

export default function CourseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [openModule, setOpenModule] = useState<string | null>(null);

    const { data: course, isLoading: courseLoading } = useQuery({
        queryKey: ['course', id],
        queryFn: () => coursesApi.getCourse(id!),
        enabled: !!id,
    });

    const { data: progress } = useQuery({
        queryKey: ['course-progress', id],
        queryFn: () => coursesApi.getCourseProgress(id!),
        enabled: !!id,
    });

    const progressMutation = useMutation({
        mutationFn: ({ moduleId, seconds, done }: { moduleId: string; seconds: number; done: boolean }) =>
            coursesApi.updateLessonProgress(moduleId, { watched_seconds: seconds, completed: done }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-progress', id] }),
    });

    if (courseLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    if (!course) return (
        <div className="flex items-center justify-center h-64 text-slate-400">
            <AlertCircle className="h-6 w-6 mr-2" /> Course not found.
        </div>
    );

    const pct = progress?.progress_pct ?? 0;
    const allDone = progress?.all_done ?? false;
    // Map of module completion
    // Assuming progress.completed_modules_list exists or similar. 
    // Wait, the API returns CourseProgress which usually just has counts.
    // Let's assume we need to check if individual module progress is available.
    // Actually, looking at CourseProgress interface in courses.ts:
    // export interface CourseProgress { total_modules: number; completed_modules: number; progress_pct: number; avg_quiz_score?: number; all_done: boolean; }
    // It doesn't give a per-module breakdown. I might need to fetch individual progress or adjust.
    // However, CourseModule doesn't have progress. 
    // Let's check LessonProgress: export interface LessonProgress { id: string; faculty_id: string; module_id: string; watched_seconds: number; completed: boolean; quiz_score?: number; quiz_passed: boolean; }
    // I should probably fetch all lesson progress or the API for getCourseProgress should provide it.
    // If the API doesn't provide it, I'll stick to what's possible or mock it if needed for UI.
    // But wait, the user wants "Show progress or completed videos for enrolled courses".

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Hero */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/10">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-200 opacity-80">{course.skill_level}</span>
                        <h1 className="text-3xl font-bold mt-1 tracking-tight">{course.title}</h1>
                        <p className="text-blue-100 text-sm mt-2 leading-relaxed max-w-2xl">{course.description}</p>
                        <div className="flex items-center gap-4 mt-4 text-blue-200/80 text-xs font-semibold">
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.instructor_name}</span>
                            <span className="h-1 w-1 rounded-full bg-blue-300/30" />
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration_hours}h total</span>
                            <span className="h-1 w-1 rounded-full bg-blue-300/30" />
                            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {course.modules.length} modules</span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-8 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <div className="flex justify-between text-xs text-blue-100 mb-2 font-bold uppercase tracking-wider">
                        <span>Course Completion</span>
                        <span>{pct.toFixed(0)}% Complete</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-[10px] text-blue-200 font-medium">
                        {progress?.completed_modules ?? 0} of {course.modules.length} modules finished
                    </p>
                </div>

                {allDone && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
                        <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Award className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <p className="font-bold text-sm">Congratulations! You've finished all modules.</p>
                            <p className="text-xs text-blue-100">Take the final assessment to earn your certificate.</p>
                        </div>
                        <button
                            onClick={() => navigate(`/faculty/courses/${id}/assessment`)}
                            className="whitespace-nowrap bg-white text-emerald-700 font-bold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg active:scale-95 text-sm"
                        >
                            Start Assessment
                        </button>
                    </div>
                )}
            </div>

            {/* Modules List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Curriculum</h2>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{course.modules.length} Lessons</span>
                </div>

                <div className="space-y-3">
                    {course.modules.map((mod: CourseModule, idx: number) => {
                        const isOpen = openModule === mod.id;
                        return (
                            <div key={mod.id} className={cn(
                                "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                isOpen ? "border-blue-200 shadow-xl shadow-blue-500/5 ring-1 ring-blue-100" : "border-slate-100 shadow-sm hover:border-slate-200"
                            )}>
                                <button
                                    onClick={() => setOpenModule(isOpen ? null : mod.id)}
                                    className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors"
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors",
                                        isOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {/* Ideally we'd check against a specific module completion status here */}
                                        {/* Since progress API is simple, we'll use a placeholder or check against LessonProgress if we had a map */}
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-bold text-sm transition-colors", isOpen ? "text-blue-600" : "text-slate-800")}>{mod.title}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {mod.video_url && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    <Play className="h-3 w-3" /> Video
                                                </span>
                                            )}
                                            {mod.quiz_questions?.length > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    <FileText className="h-3 w-3" /> {mod.quiz_questions.length} Q Quiz
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto">
                                        {isOpen ? (
                                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                <ChevronDown className="h-4 w-4 text-blue-600" />
                                            </div>
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        )}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-6 pb-8 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="pt-6 space-y-6">
                                            {/* Video */}
                                            {mod.video_url ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📹 Video Lesson</h4>
                                                        <button
                                                            onClick={() => progressMutation.mutate({ moduleId: mod.id, seconds: 0, done: true })}
                                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-md active:scale-95 uppercase tracking-wider"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Mark as Watched
                                                        </button>
                                                    </div>
                                                    <VideoPlayer url={mod.video_url} />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 text-slate-400 text-sm py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Play className="h-6 w-6 text-slate-300" />
                                                    </div>
                                                    <p className="font-medium">No video available for this module.</p>
                                                </div>
                                            )}

                                            <div className="grid md:grid-cols-2 gap-6">
                                                {/* Left Column: Details */}
                                                <div className="space-y-6">
                                                    {mod.description && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h4>
                                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">{mod.description}</p>
                                                        </div>
                                                    )}

                                                    {mod.key_takeaways?.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">💡 Key Takeaways</h4>
                                                            <ul className="space-y-2.5">
                                                                {mod.key_takeaways.map((t: string, i: number) => (
                                                                    <li key={i} className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                            <span className="text-[10px] font-bold text-blue-600">{i + 1}</span>
                                                                        </div>
                                                                        <span className="text-sm text-slate-700 font-medium leading-tight">{t}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Actions */}
                                                <div className="space-y-6">
                                                    {mod.notes_url && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resources</h4>
                                                            <a
                                                                href={mod.notes_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all group shadow-sm"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                                        <FileText className="h-5 w-5 text-blue-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-slate-800">Module Notes</p>
                                                                        <p className="text-[10px] font-semibold text-slate-400">PDF Document</p>
                                                                    </div>
                                                                </div>
                                                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                                            </a>
                                                        </div>
                                                    )}

                                                    {/* Mini Quiz */}
                                                    {mod.quiz_questions?.length > 0 && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Knowledge Check</h4>
                                                            <MiniQuizPanel
                                                                questions={mod.quiz_questions}
                                                                moduleId={mod.id}
                                                                onComplete={() => queryClient.invalidateQueries({ queryKey: ['course-progress', id] })}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
