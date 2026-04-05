import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { Button } from '../../components/ui/Button';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { LoadingState } from '../../components/ui/LoadingState';

export default function TestPlayer() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [attemptInitError, setAttemptInitError] = useState<string | null>(null);
    const attemptStarted = useRef(false);

    const { data: test, isLoading: isLoadingTest } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testsApi.getTest(id!),
        enabled: !!id,
    });

    const testQuestions = test?.questions || [];

    // Reset attempt setup state when test changes.
    useEffect(() => {
        attemptStarted.current = false;
        setAttemptId(null);
        setAttemptInitError(null);
        setTimeLeft(0);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview(new Set());
    }, [id, user?.id]);

    // Initialize timer after attempt starts.
    useEffect(() => {
        if (test && attemptId && timeLeft === 0) {
            setTimeLeft(test.time_limit_minutes * 60);
        }
    }, [test, attemptId, timeLeft]);

    const initializeAttempt = useCallback(() => {
        if (!id || !user || attemptStarted.current) return;
        attemptStarted.current = true;
        setAttemptInitError(null);

        attemptsApi.createAttempt({ test_id: id })
            .then(res => setAttemptId(res.id))
            .catch((err) => {
                const detail = err?.response?.data?.detail || 'Failed to start test attempt';
                setAttemptInitError(detail);
                addToast(detail, 'error');
            });
    }, [id, user, addToast]);

    // Create the attempt
    useEffect(() => {
        initializeAttempt();
    }, [initializeAttempt]);

    const submitMutation = useMutation({
        mutationFn: (data: { answers: { question_id: string; selected_option: string }[] }) =>
            attemptsApi.submitAttempt(attemptId!, data),
        onSuccess: (data) => {
            addToast('Test submitted successfully!', 'success');
            navigate(`/faculty/tests/${id}/result/${data.id}`);
        },
        onError: (err: any) => {
            const detail = err?.base?.message || err?.response?.data?.detail || 'Submission failed. Please try again.';
            addToast(detail, 'error');
        }
    });

    const handleSubmit = useCallback(() => {
        if (!attemptId) return;
        if (submitMutation.isPending) return;

        const mappedAnswers = Object.entries(answers).map(([qId, option]) => ({
            question_id: qId,
            selected_option: option
        }));

        submitMutation.mutate({ answers: mappedAnswers });
    }, [attemptId, answers, submitMutation]);

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                if (attemptId && !submitMutation.isPending) handleSubmit();
                return 0;
            }
            return prev - 1;
        }), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, attemptId, handleSubmit]);

    if (isLoadingTest) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white">
                <LoadingState label="Setting up your exam" fullScreen />
            </div>
        );
    }

    if (!test || testQuestions.length === 0) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold">Test not found or has no questions.</h1>
                <Button onClick={() => navigate('/faculty/tests')} className="mt-4">Back to Tests</Button>
            </div>
        );
    }

    if (!attemptId) {
        return (
            <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center p-6">
                <div className="max-w-lg w-full text-center border border-slate-200 rounded-2xl p-8 bg-white shadow-sm space-y-4">
                    {attemptInitError ? (
                        <>
                            <h2 className="text-xl font-bold text-slate-900">Could not start this test</h2>
                            <p className="text-sm text-slate-600">{attemptInitError}</p>
                            <div className="flex justify-center gap-3">
                                <Button variant="outline" onClick={() => navigate('/faculty/tests')}>Back to Tests</Button>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        attemptStarted.current = false;
                                        initializeAttempt();
                                    }}
                                >
                                    Retry
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                            <p className="text-slate-500 font-medium">Starting your test attempt...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const currentQuestion = testQuestions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;
    const reviewCount = markedForReview.size;
    const remainingCount = testQuestions.length - answeredCount;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (optionLetter: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: optionLetter
        }));
    };

    const toggleMarkForReview = () => {
        setMarkedForReview(prev => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
            else next.add(currentQuestion.id);
            return next;
        });
    };

    const clearSelection = () => {
        setAnswers(prev => {
            const next = { ...prev };
            delete next[currentQuestion.id];
            return next;
        });
    };

    const getQuestionStatus = (index: number) => {
        const qId = testQuestions[index].id;
        if (markedForReview.has(qId)) return 'marked';
        if (answers[qId]) return 'answered';
        return 'not-visited';
    };

    return (
        <div className="fixed inset-0 bg-slate-50 z-[9999] flex flex-col font-sans overflow-hidden">
            {/* Professional Header */}
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                        F
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 leading-tight line-clamp-1">{test.title}</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Official Assessment</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2.5 px-5 py-2 rounded-xl font-mono text-lg font-semibold border transition-colors ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                        <Clock className={`h-5 w-5 ${timeLeft < 300 ? 'text-rose-500' : 'text-slate-400'}`} />
                        {formatTime(timeLeft)}
                    </div>
                    <Button
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 rounded-xl shadow-lg shadow-emerald-600/20 h-11"
                        onClick={handleSubmit}
                        disabled={!attemptId || submitMutation.isPending}
                    >
                        {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Submit Test
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Left: Main Content */}
                <div className="flex-1 flex flex-col overflow-y-auto bg-white p-8 lg:p-12 relative">
                    <div className="max-w-3xl mx-auto w-full">
                        {/* Question Number Row */}
                        <div className="flex items-center gap-3 mb-8">
                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm">
                                {currentQuestionIndex + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Question</span>
                        </div>

                        {/* Question Text */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-semibold text-slate-800 leading-relaxed mb-4">
                                {currentQuestion.question_text}
                            </h2>
                            <div className="h-1 w-20 bg-blue-600 rounded-full" />
                        </div>

                        {/* Options */}
                        <div className="space-y-4 mb-16">
                            {[
                                { key: 'A', text: currentQuestion.option_a },
                                { key: 'B', text: currentQuestion.option_b },
                                { key: 'C', text: currentQuestion.option_c },
                                { key: 'D', text: currentQuestion.option_d }
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => handleOptionSelect(opt.key)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left group",
                                        answers[currentQuestion.id] === opt.key
                                            ? "border-blue-600 bg-blue-50/50"
                                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center font-semibold text-sm border-2 transition-colors",
                                        answers[currentQuestion.id] === opt.key
                                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                            : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500"
                                    )}>
                                        {opt.key}
                                    </div>
                                    <span className={cn(
                                        "font-medium text-lg leading-tight",
                                        answers[currentQuestion.id] === opt.key ? "text-blue-800" : "text-slate-600"
                                    )}>
                                        {opt.text}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-8 pb-12">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={toggleMarkForReview}
                                    className={cn(
                                        "rounded-xl h-12 px-6 font-semibold transition-all",
                                        markedForReview.has(currentQuestion.id)
                                            ? "bg-amber-50 border-amber-300 text-amber-600 shadow-sm"
                                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {markedForReview.has(currentQuestion.id) ? 'Unmark Review' : 'Mark for Review'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={clearSelection}
                                    disabled={!answers[currentQuestion.id]}
                                    className="text-slate-400 hover:text-slate-600 font-semibold hover:bg-transparent"
                                >
                                    Clear Answer
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-12 px-6 font-semibold border-slate-200 text-slate-600"
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                <Button
                                    className="rounded-xl h-12 px-8 font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(testQuestions.length - 1, prev + 1))}
                                    disabled={currentQuestionIndex === testQuestions.length - 1}
                                >
                                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Navigation Sidebar */}
                <aside className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
                    {/* Status Stats */}
                    <div className="p-6 border-b border-slate-200 bg-white grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50 text-emerald-700">
                            <span className="text-xl font-semibold">{answeredCount}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Answered</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-amber-50 text-amber-700">
                            <span className="text-xl font-semibold">{reviewCount}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Review</span>
                        </div>
                        <div className="flex flex-col items-center p-3 rounded-xl bg-slate-100 text-slate-500">
                            <span className="text-xl font-semibold">{remainingCount}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Left</span>
                        </div>
                    </div>

                    {/* Question Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Question Overview</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {testQuestions.map((_, i) => {
                                const status = getQuestionStatus(i);
                                const isActive = currentQuestionIndex === i;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentQuestionIndex(i)}
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-200 border-2",
                                            isActive ? "scale-110 shadow-md ring-2 ring-blue-600 ring-offset-2" : "hover:scale-105",
                                            status === 'marked' ? "bg-amber-500 border-amber-600 text-white" :
                                                status === 'answered' ? "bg-emerald-500 border-emerald-600 text-white" :
                                                    "bg-white border-slate-200 text-slate-400"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="p-6 bg-white border-t border-slate-200 space-y-3">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                            <div className="h-3 w-3 rounded bg-emerald-500" /> <span>Answered</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                            <div className="h-3 w-3 rounded bg-amber-500" /> <span>Marked for Review</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                            <div className="h-3 w-3 rounded bg-white border border-slate-300" /> <span>Not Answered</span>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
