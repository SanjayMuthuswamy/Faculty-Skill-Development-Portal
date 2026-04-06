import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, XCircle, ChevronLeft, Loader2, Clock, CalendarDays, Target, Circle } from 'lucide-react';

const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
};

const formatDateTime = (value?: string) => {
    if (!value) return 'Not available';

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
};

export default function TestResult() {
    const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
    const navigate = useNavigate();

    const { data: test, isLoading: isLoadingTest } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testsApi.getTest(id!),
        enabled: !!id,
    });

    const { data: attempt, isLoading: isLoadingAttempt } = useQuery({
        queryKey: ['attempt', attemptId],
        queryFn: () => attemptsApi.getAttempt(attemptId!),
        enabled: !!attemptId,
    });

    const testQuestions = test?.questions || [];

    const answersRecord = useMemo(() => {
        const record: Record<string, string> = {};
        attempt?.answers?.forEach((answer) => {
            record[answer.question_id] = answer.selected_option?.trim()?.toUpperCase();
        });
        return record;
    }, [attempt]);

    if (isLoadingTest || isLoadingAttempt) {
        return (
            <div className="flex bg-gray-50 h-[400px] items-center justify-center p-12">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4 mx-auto" />
                    <p className="text-gray-500">Loading results...</p>
                </div>
            </div>
        );
    }

    if (!attempt || !test) {
        return (
            <div className="flex bg-gray-50 h-[400px] items-center justify-center p-12 text-center">
                <p className="text-gray-500">Could not find attempt or test details.</p>
            </div>
        );
    }

    const passed = (attempt.accuracy || 0) >= test.pass_marks;

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/faculty/tests')}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Tests
                </Button>
            </div>

            <Card className={`overflow-hidden border-0 shadow-lg ${passed ? 'bg-green-50/70' : 'bg-red-50/70'}`}>
                <CardHeader className="space-y-5 border-b border-white/70 bg-white/70 backdrop-blur">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Official Assessment Review</p>
                            <CardTitle className="mt-2 text-3xl text-slate-900">{test.title}</CardTitle>
                            <p className="mt-2 text-sm text-slate-600">
                                Score review with correct answers, your selections, and timing details.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="text-sm text-slate-500">Score</p>
                                <p className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                                    {Math.round(attempt.accuracy || 0)}%
                                </p>
                            </div>
                            <div className="h-12 w-px bg-slate-200" />
                            <div className="text-center">
                                <p className="text-sm text-slate-500">Result</p>
                                <Badge className="px-4 py-1 text-lg" variant={passed ? 'success' : 'destructive'}>
                                    {passed ? 'PASSED' : 'FAILED'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-blue-100 bg-blue-50/70">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-blue-600">Total Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold text-slate-900">{attempt.total}</p>
                    </CardContent>
                </Card>
                <Card className="border-green-100 bg-green-50/70">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-green-600">Correct</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold text-slate-900">{attempt.correct_count}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-100 bg-red-50/70">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-red-600">Incorrect</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold text-slate-900">{attempt.incorrect_count}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50/80">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-slate-600">Unanswered</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold text-slate-900">{attempt.unanswered_count}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 py-5">
                        <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Time Taken</p>
                            <p className="text-xl font-bold text-slate-900">{formatDuration(attempt.time_taken_seconds)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 py-5">
                        <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Started At</p>
                            <p className="text-sm font-semibold text-slate-900">{formatDateTime(attempt.started_at)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 py-5">
                        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Submitted At</p>
                            <p className="text-sm font-semibold text-slate-900">{formatDateTime(attempt.submitted_at)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-semibold text-slate-900">Question Review</h3>
                    <p className="text-sm text-slate-500">Green shows the correct answer. Red shows a wrong selected answer.</p>
                </div>

                {testQuestions.map((question, index) => {
                    const selectedOptionLetter = answersRecord[question.id];
                    const isAnswered = Boolean(selectedOptionLetter);
                    const isCorrect = isAnswered && selectedOptionLetter === question.correct_option;

                    const options = {
                        A: question.option_a,
                        B: question.option_b,
                        C: question.option_c,
                        D: question.option_d,
                    };

                    const optionEntries = Object.entries(options);

                    const containerClass = isCorrect
                        ? 'border-green-200 bg-green-50/40'
                        : isAnswered
                            ? 'border-red-200 bg-red-50/40'
                            : 'border-slate-200 bg-slate-50/70';

                    return (
                        <Card key={question.id} className={containerClass}>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">Question {index + 1}</p>
                                        <CardTitle className="mt-2 text-lg leading-relaxed text-slate-900">
                                            {question.question_text}
                                        </CardTitle>
                                    </div>
                                    {isCorrect ? (
                                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                            Correct
                                        </Badge>
                                    ) : isAnswered ? (
                                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                                            Incorrect
                                        </Badge>
                                    ) : (
                                        <Badge className="border-slate-200 bg-white text-slate-600 hover:bg-white">
                                            Unanswered
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    {optionEntries.map(([letter, text]) => {
                                        const isSelected = selectedOptionLetter === letter;
                                        const isAnswer = question.correct_option === letter;

                                        let style = 'rounded-xl border p-3 text-sm ';
                                        if (isAnswer) style += 'border-green-300 bg-green-100 text-green-900';
                                        else if (isSelected) style += 'border-red-300 bg-red-50 text-red-900';
                                        else style += 'border-slate-200 bg-white text-slate-700';

                                        return (
                                            <div key={letter} className={style}>
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={[
                                                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                                                            isAnswer
                                                                ? 'border-green-600 bg-green-600 text-white'
                                                                : isSelected
                                                                    ? 'border-red-600 bg-red-600 text-white'
                                                                    : 'border-slate-300 bg-white text-slate-500',
                                                        ].join(' ')}
                                                    >
                                                        {letter}
                                                    </div>

                                                    {isAnswer ? (
                                                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                                    ) : isSelected ? (
                                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                                    ) : (
                                                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                                                    )}

                                                    <span className="flex-1 leading-relaxed">{text}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                        <span className="font-semibold">Your Answer:</span>{' '}
                                        {selectedOptionLetter ? `${selectedOptionLetter}` : 'Not answered'}
                                    </div>
                                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                                        <span className="font-semibold">Correct Answer:</span> {question.correct_option}
                                    </div>
                                </div>

                                {question.explanation ? (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                                        <span className="font-semibold text-slate-900">Explanation:</span> {question.explanation}
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
