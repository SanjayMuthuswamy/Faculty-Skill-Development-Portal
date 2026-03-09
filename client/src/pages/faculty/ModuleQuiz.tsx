import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, Lock, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CourseModule, LessonProgress, coursesApi } from '../../lib/api/courses';

const PASS_PERCENT = 60;

export default function ModuleQuizPage() {
    const { id, moduleId } = useParams<{ id: string; moduleId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentQ, setCurrentQ] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<LessonProgress | null>(null);

    const { data: course, isLoading: isCourseLoading } = useQuery({
        queryKey: ['course', id],
        queryFn: () => coursesApi.getCourse(id!),
        enabled: !!id,
    });

    const { data: progress, isLoading: isProgressLoading } = useQuery({
        queryKey: ['course-progress', id],
        queryFn: () => coursesApi.getCourseProgress(id!),
        enabled: !!id,
    });

    const modules = useMemo(
        () => [...(course?.modules ?? [])].sort((a, b) => a.order_index - b.order_index),
        [course?.modules]
    );
    const moduleIdx = modules.findIndex((m) => m.id === moduleId);
    const module = moduleIdx >= 0 ? modules[moduleIdx] : null;
    const prevModule = moduleIdx > 0 ? modules[moduleIdx - 1] : null;
    const nextModule = moduleIdx >= 0 && moduleIdx < modules.length - 1 ? modules[moduleIdx + 1] : null;

    const progressByModule = useMemo(() => {
        return new Map((progress?.module_progress ?? []).map((p) => [p.module_id, p]));
    }, [progress?.module_progress]);

    const isModuleCleared = (mod: CourseModule) => {
        const p = progressByModule.get(mod.id);
        if (!p) return false;
        const hasQuiz = (mod.quiz_questions?.length ?? 0) > 0;
        return hasQuiz ? Boolean(p.quiz_passed) : Boolean(p.completed);
    };

    const isUnlocked = !prevModule || isModuleCleared(prevModule);

    useEffect(() => {
        setAnswers({});
        setCurrentQ(0);
        setSubmitted(false);
        setResult(null);
    }, [moduleId]);

    const submitMutation = useMutation({
        mutationFn: async (payload: Record<string, string>) => {
            const quizResult = await coursesApi.submitMiniQuiz(moduleId!, payload);
            if (quizResult.quiz_passed) {
                await coursesApi.updateLessonProgress(moduleId!, { watched_seconds: 0, completed: true });
            }
            return quizResult;
        },
        onSuccess: async (data) => {
            setResult(data);
            setSubmitted(true);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['course-progress', id] }),
                queryClient.invalidateQueries({ queryKey: ['course', id] }),
            ]);
        },
    });

    if (isCourseLoading || isProgressLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!course || !module) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                <AlertCircle className="h-8 w-8" />
                <p>Quiz module not found.</p>
                <button onClick={() => navigate(`/faculty/courses/${id}`)} className="text-blue-600 text-sm font-semibold">
                    Back to Course
                </button>
            </div>
        );
    }

    if ((module.quiz_questions?.length ?? 0) === 0) {
        return (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
                <p className="text-slate-700 font-semibold">No quiz questions found for this module yet.</p>
                <button
                    onClick={() => navigate(`/faculty/courses/${id}`)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    Back to Course
                </button>
            </div>
        );
    }

    if (!isUnlocked) {
        return (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-amber-100 shadow-sm p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Quiz Locked</h2>
                <p className="text-sm text-slate-600">
                    Clear <span className="font-semibold">{prevModule?.title}</span> first with at least {PASS_PERCENT}% to unlock this quiz.
                </p>
                <button
                    onClick={() => navigate(`/faculty/courses/${id}`)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    Back to Course
                </button>
            </div>
        );
    }

    if (submitted && result) {
        const score = result.quiz_score ?? 0;
        const passed = result.quiz_passed;
        return (
            <div className="max-w-2xl mx-auto space-y-5">
                <div className={cn(
                    "rounded-2xl p-6 text-center",
                    passed ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"
                )}>
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                        {passed ? <CheckCircle2 className="h-7 w-7 text-white" /> : <AlertCircle className="h-7 w-7 text-white" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white">{passed ? 'Module Cleared' : 'Retry Required'}</h2>
                    <p className="text-white/85 mt-1 text-sm">
                        Score: {score.toFixed(0)}% | Passing: {PASS_PERCENT}%
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center gap-3">
                    {!passed && (
                        <button
                            onClick={() => {
                                setAnswers({});
                                setCurrentQ(0);
                                setSubmitted(false);
                                setResult(null);
                            }}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="h-4 w-4" /> Retry Quiz
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/faculty/courses/${id}`)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Back to Course
                    </button>
                    {passed && nextModule && (
                        <button
                            onClick={() => navigate(`/faculty/courses/${id}/modules/${nextModule.id}/quiz`)}
                            className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors"
                        >
                            Next Module Quiz
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const questions = module.quiz_questions;
    const question = questions[currentQ];
    const isLast = currentQ === questions.length - 1;

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
                <p className="text-xs text-slate-400 font-medium">Attend Quiz</p>
                <p className="text-sm font-bold text-slate-800">{module.title}</p>
            </div>

            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Question {currentQ + 1} of {questions.length}
                </p>
                <h2 className="text-base font-semibold text-slate-800 mb-5 leading-relaxed">{question.question_text}</h2>
                <div className="space-y-2.5">
                    {Object.entries(question.options).map(([key, val]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: key }))}
                            className={cn(
                                "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                                answers[question.id] === key
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                            )}
                        >
                            <span className={cn(
                                "h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0",
                                answers[question.id] === key ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"
                            )}>
                                {key}
                            </span>
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                    disabled={currentQ === 0}
                    className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Previous
                </button>

                <div className="flex-1 flex justify-center gap-1.5 flex-wrap">
                    {questions.map((q, i) => (
                        <button
                            key={q.id}
                            onClick={() => setCurrentQ(i)}
                            className={cn(
                                "h-6 w-6 rounded-full text-xs font-bold transition-colors",
                                i === currentQ
                                    ? "bg-blue-600 text-white"
                                    : answers[q.id]
                                        ? "bg-green-500 text-white"
                                        : "bg-slate-200 text-slate-500"
                            )}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                {isLast ? (
                    <button
                        onClick={() => submitMutation.mutate(answers)}
                        disabled={submitMutation.isPending || Object.keys(answers).length < questions.length}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {submitMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
                        disabled={!answers[question.id]}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        Next
                    </button>
                )}
            </div>

            {submitMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to submit quiz. Please try again.
                </div>
            )}
        </div>
    );
}
