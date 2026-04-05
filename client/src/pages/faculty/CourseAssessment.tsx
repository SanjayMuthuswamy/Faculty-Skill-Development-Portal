import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { coursesApi, AssessmentQuestion, CourseAttempt } from '../../lib/api/courses';
import { Timer, CheckCircle, XCircle, Loader2, AlertCircle, Award, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LoadingState } from '../../components/ui/LoadingState';

const TIME_LIMIT = 25 * 60; // 25 minutes in seconds

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function ResultPanel({ attempt, courseId }: { attempt: CourseAttempt; courseId: string }) {
    const navigate = useNavigate();
    const passed = attempt.passed;
    const feedback = attempt.ai_feedback;

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Score Card */}
            <div className={cn(
                "rounded-2xl p-6 text-center",
                passed ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"
            )}>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                    {passed ? <Award className="h-8 w-8 text-white" /> : <XCircle className="h-8 w-8 text-white" />}
                </div>
                <h2 className="text-2xl font-bold text-white">{passed ? '🎉 Congratulations!' : 'Try Again'}</h2>
                <p className="text-white/80 mt-1">{passed ? 'You passed the assessment!' : 'You did not meet the passing score.'}</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-white">
                    <div className="bg-white/20 rounded-xl p-3">
                        <p className="text-2xl font-bold">{attempt.score.toFixed(0)}%</p>
                        <p className="text-xs opacity-80">Your Score</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                        <p className="text-2xl font-bold">{attempt.correct_answers}/{attempt.total_questions}</p>
                        <p className="text-xs opacity-80">Correct</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                        <p className="text-2xl font-bold">60%</p>
                        <p className="text-xs opacity-80">Passing</p>
                    </div>
                </div>
            </div>

            {/* AI Feedback */}
            {feedback && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold text-slate-800">AI Performance Feedback</h3>
                    </div>
                    {feedback.weak_areas?.length > 0 && (
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-red-600 mb-2">⚠️ Weak Areas Identified:</p>
                            <ul className="space-y-1">
                                {feedback.weak_areas.map((area: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-red-400 mt-0.5 flex-shrink-0">•</span> {area}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {feedback.suggestions?.length > 0 && (
                        <div>
                            <p className="text-sm font-semibold text-blue-600 mb-2">💡 Improvement Suggestions:</p>
                            <ul className="space-y-1">
                                {feedback.suggestions.map((s: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span> {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={() => navigate(`/faculty/courses/${courseId}`)}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                    Back to Course
                </button>
                {passed && (
                    <button
                        onClick={() => navigate(`/faculty/courses/${courseId}/certificate`)}
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Award className="h-4 w-4" /> Get Certificate
                    </button>
                )}
            </div>
        </div>
    );
}

export default function CourseAssessmentPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const [submitted, setSubmitted] = useState(false);
    const [attempt, setAttempt] = useState<CourseAttempt | null>(null);
    const startTime = useRef(Date.now());
    const answersRef = useRef<Record<string, string>>({});

    const { data: questions = [], isLoading } = useQuery({
        queryKey: ['assessment', id],
        queryFn: () => coursesApi.getAssessment(id!),
        enabled: !!id,
    });

    const submitMutation = useMutation({
        mutationFn: (ans: Record<string, string>) =>
            coursesApi.submitAssessment(id!, ans, Math.floor((Date.now() - startTime.current) / 1000)),
        onSuccess: (data) => {
            setAttempt(data);
            setSubmitted(true);
        },
    });

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        if (submitted || questions.length === 0) return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timer); submitMutation.mutate(answersRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [submitted, questions.length, submitMutation]);

    if (isLoading) return <LoadingState label="Loading assessment" compact />;

    if (questions.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>No assessment questions found for this course yet.</p>
            <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 text-sm underline">Go Back</button>
        </div>
    );

    if (submitted && attempt) return <ResultPanel attempt={attempt} courseId={id!} />;

    const q = questions[currentQ] as AssessmentQuestion;
    const progress = ((currentQ + 1) / questions.length) * 100;
    const isLast = currentQ === questions.length - 1;
    const timerWarning = timeLeft < 5 * 60;
    const handleOptionSelect = (optionKey: string) => {
        setAnswers((prev) => ({ ...prev, [q.id]: optionKey }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Header Bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
                <div>
                    <p className="text-xs text-slate-400 font-medium">Final Assessment</p>
                    <p className="text-sm font-bold text-slate-800">Question {currentQ + 1} of {questions.length}</p>
                </div>
                <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm",
                    timerWarning ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-700"
                )}>
                    <Timer className="h-4 w-4" /> {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress */}
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            {/* Question */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-5 leading-relaxed">{q.question_text}</h2>
                <div className="space-y-2.5">
                    {Object.entries(q.options).map(([key, val]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => handleOptionSelect(key)}
                            className={cn(
                                "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer border-2 text-sm font-medium transition-all",
                                answers[q.id] === key
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                            )}
                        >
                            <span className={cn(
                                "h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0",
                                answers[q.id] === key ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"
                            )}>{key}</span>
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                    disabled={currentQ === 0}
                    className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                    Previous
                </button>

                {/* Question dots */}
                <div className="flex-1 flex justify-center gap-1.5 flex-wrap">
                    {questions.map((_: AssessmentQuestion, i: number) => (
                        <button
                            key={i}
                            onClick={() => setCurrentQ(i)}
                            className={cn(
                                "h-6 w-6 rounded-full text-xs font-bold transition-colors",
                                i === currentQ ? "bg-blue-600 text-white" :
                                    answers[questions[i].id] ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                            )}
                        >{i + 1}</button>
                    ))}
                </div>

                {isLast ? (
                    <button
                        onClick={() => submitMutation.mutate(answers)}
                        disabled={submitMutation.isPending || !answers[q.id]}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Submit
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
}
