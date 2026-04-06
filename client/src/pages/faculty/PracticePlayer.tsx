import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { practiceSetsApi } from '../../lib/api/practiceSets';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';
import { LoadingState } from '../../components/ui/LoadingState';

export default function PracticePlayer() {
    const { setId } = useParams<{ setId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [isFinished, setIsFinished] = useState(false);

    const { data: currentSet, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['practice-set', setId],
        queryFn: () => practiceSetsApi.getSet(setId!),
        enabled: !!setId && !!user?.id
    });

    const submitMutation = useMutation({
        mutationFn: (result: { score: number; accuracy: number }) =>
            practiceSetsApi.submitResult(setId!, result),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-practice-sets'] });
            queryClient.invalidateQueries({ queryKey: ['performance'] });
            addToast('Test completed!', 'success');
            setIsFinished(true);
        },
        onError: (error: any) => {
            console.error("Practice test submit error:", error);
            const msg = error.response?.data?.detail || error.message || 'Unknown error occurred';
            addToast(`Failed to submit: ${msg}`, 'error');
        }
    });

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white">
                <LoadingState label="Preparing practice session" fullScreen />
            </div>
        );
    }

    if (isError || !currentSet) {
        const detail =
            (error as any)?.response?.data?.detail ||
            (error as Error | undefined)?.message ||
            'Unable to load this practice set right now.';
        return (
            <div className="fixed inset-0 bg-slate-50 z-[9999] flex items-center justify-center p-6">
                <Card className="max-w-lg w-full p-8 text-center space-y-5 border border-red-100">
                    <div className="h-14 w-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Could not open practice set</h2>
                        <p className="text-sm text-slate-600 mt-2">{detail}</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => navigate('/faculty/practice')}>
                            Back
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const questions = currentSet.questions;
    const currentQuestion = questions[currentIdx];
    const answeredCount = Object.keys(answers).length;
    const reviewCount = markedForReview.size;
    const remainingCount = questions.length - answeredCount;

    const handleSelect = (option: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
    };

    const toggleMarkForReview = () => {
        setMarkedForReview(prev => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
            else next.add(currentQuestion.id);
            return next;
        });
    };

    const handleFinish = () => {
        let correct = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_option) correct++;
        });

        const accuracy = Math.round((correct / questions.length) * 100);
        submitMutation.mutate({ score: correct, accuracy });
    };

    if (isFinished) {
        const score = Math.round((questions.filter(q => answers[q.id] === q.correct_option).length / questions.length) * 100);
        const correctCount = questions.filter(q => answers[q.id] === q.correct_option).length;

        return (
            <div className="fixed inset-0 bg-slate-50 z-[9999] flex items-center justify-center p-6 overflow-y-auto">
                <Card className="max-w-xl w-full text-center p-10 border-none shadow-2xl rounded-3xl bg-white">
                    <div className="mb-6 flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle className="h-10 w-10" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Practice Complete!</h2>
                    <p className="text-slate-500 font-medium mb-8">Great job on finishing the AI-generated practice set.</p>

                    <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-100">
                        <div className="text-6xl font-black text-slate-900 mb-2">
                            {score}%
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your Accuracy</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Correct Answers</p>
                            <p className="text-xl font-bold text-slate-800">{correctCount} / {questions.length}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Time Spent</p>
                            <p className="text-xl font-bold text-slate-800">Practice Mode</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="outline"
                            className="rounded-xl h-12 px-8 font-bold border-slate-200 text-slate-600"
                            onClick={() => setIsFinished(false)}
                        >
                            Review Session
                        </Button>
                        <Button
                            className="rounded-xl h-12 px-8 font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                            onClick={() => navigate('/faculty/practice')}
                        >
                            Return to Sandbox
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-50 z-[9999] flex flex-col font-sans overflow-hidden">
            <header className="min-h-16 bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-4 shadow-sm flex-shrink-0">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-semibold text-slate-900 leading-tight line-clamp-1">AI Practice: {currentSet.domain}</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{currentSet.difficulty} • {currentSet.source} Mode</p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Practice Mode</div>
                        <div className="text-sm font-semibold text-indigo-600">No Time Limit</div>
                    </div>
                    <Button
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 rounded-xl shadow-lg shadow-indigo-600/20 h-11"
                        onClick={handleFinish}
                        disabled={submitMutation.isPending}
                    >
                        {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Finish Practice
                    </Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto bg-white px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-12 relative">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex items-center gap-3 mb-6 sm:mb-8">
                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-sm">
                                {currentIdx + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Question</span>
                        </div>

                        <div className="mb-8 sm:mb-10">
                            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 leading-relaxed mb-4">
                                {currentQuestion.question_text}
                            </h2>
                            <div className="h-1 w-20 bg-indigo-600 rounded-full" />
                        </div>

                        <div className="space-y-3 sm:space-y-4 pb-32">
                            {[
                                { k: 'A', t: currentQuestion.option_a },
                                { k: 'B', t: currentQuestion.option_b },
                                { k: 'C', t: currentQuestion.option_c },
                                { k: 'D', t: currentQuestion.option_d }
                            ].map((opt) => (
                                <button
                                    key={opt.k}
                                    onClick={() => handleSelect(opt.k)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 text-left group",
                                        answers[currentQuestion.id] === opt.k
                                            ? "border-indigo-600 bg-indigo-50/50"
                                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center font-semibold text-sm border-2 transition-colors",
                                        answers[currentQuestion.id] === opt.k
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                            : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500"
                                    )}>
                                        {opt.k}
                                    </div>
                                    <span className={cn(
                                        "font-medium text-base sm:text-lg leading-tight",
                                        answers[currentQuestion.id] === opt.k ? "text-indigo-800" : "text-slate-600"
                                    )}>
                                        {opt.t}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 lg:px-8 xl:px-12">
                            <div className="mx-auto flex max-w-3xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <Button
                                    variant="outline"
                                    className="rounded-xl h-12 px-6 font-semibold border-slate-200 text-slate-600"
                                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                    disabled={currentIdx === 0}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                <Button
                                    className="rounded-xl h-12 px-8 font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                    disabled={currentIdx === questions.length - 1}
                                >
                                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 leading-relaxed font-medium">
                                <p className="font-semibold mb-1 underline uppercase">Review Mode Information</p>
                                Practice mode is designed for learning. Take your time to analyze each question. Use <strong>Mark for Review</strong> to revisit questions you're unsure about.
                            </div>
                        </div>
                    </div>
                </div>

                <aside className="hidden xl:flex w-80 bg-slate-50 border-l border-slate-200 flex-col overflow-hidden flex-shrink-0">
                    <div className="p-6 border-b border-slate-200 bg-white grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-3 rounded-xl bg-indigo-50 text-indigo-700">
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

                    <div className="flex-1 overflow-y-auto p-6">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Practice Navigation</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {questions.map((_, i) => {
                                const qId = questions[i].id;
                                const isMarked = markedForReview.has(qId);
                                const isAnswered = !!answers[qId];
                                const isActive = currentIdx === i;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIdx(i)}
                                        className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-200 border-2",
                                            isActive ? "scale-110 shadow-md ring-2 ring-indigo-600 ring-offset-2" : "hover:scale-105",
                                            isMarked ? "bg-amber-500 border-amber-600 text-white" :
                                                isAnswered ? "bg-emerald-500 border-emerald-600 text-white" :
                                                    "bg-white border-slate-200 text-slate-400"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

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
