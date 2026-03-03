import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useExamGuard } from '../../hooks/useExamGuard';

export default function TestPlayer() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const attemptStarted = useRef(false);

    const { data: test, isLoading: isLoadingTest } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testsApi.getTest(id!),
        enabled: !!id,
    });

    const testQuestions = test?.questions || [];

    // Initialize timer
    useEffect(() => {
        if (test && timeLeft === 0) {
            setTimeLeft(test.time_limit_minutes * 60);
        }
    }, [test]);

    // Create the attempt exactly once
    useEffect(() => {
        if (!id || !user || attemptStarted.current) return;
        attemptStarted.current = true;

        attemptsApi.createAttempt({ test_id: id })
            .then(res => setAttemptId(res.id))
            .catch((err) => {
                const detail = err?.response?.data?.detail || 'Failed to start test attempt';
                addToast(detail, 'error');
                navigate('/faculty/tests');
            });
    }, [id, user]);

    const submitMutation = useMutation({
        mutationFn: (data: { answers: { question_id: string; selected_option: string }[] }) =>
            attemptsApi.submitAttempt(attemptId!, data),
        onSuccess: (data) => {
            addToast('Test submitted successfully!', 'success');
            // Exit fullscreen before navigating
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
            navigate(`/faculty/tests/${id}/result/${data.id}`);
        },
        onError: (err: any) => {
            const detail = err?.response?.data?.detail || 'Submission failed. Please try again.';
            addToast(detail, 'error');
        }
    });

    // Submit handler (memoized so exam guard can use it)
    const handleSubmit = useCallback(() => {
        if (!attemptId || submitMutation.isPending) return;

        const mappedAnswers = Object.entries(answers).map(([qId, option]) => ({
            question_id: qId,
            selected_option: option
        }));

        submitMutation.mutate({ answers: mappedAnswers });
    }, [attemptId, answers, submitMutation]);

    // 🔒 Secure Exam Guard — fullscreen + tab-switch detection
    const { violations, maxViolations, isFullscreen, warningMessage } = useExamGuard({
        maxViolations: 3,
        onAutoSubmit: handleSubmit,
        enabled: !!attemptId, // Only activate after attempt is created
    });

    // Countdown timer — auto-submit when time runs out
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(timer);
                if (attemptId && !submitMutation.isPending) {
                    handleSubmit();
                }
                return 0;
            }
            return prev - 1;
        }), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, attemptId, handleSubmit]);

    if (isLoadingTest) {
        return (
            <div className="flex bg-gray-50 h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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

    const currentQuestion = testQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / testQuestions.length) * 100;

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

    const options = {
        'A': currentQuestion.option_a,
        'B': currentQuestion.option_b,
        'C': currentQuestion.option_c,
        'D': currentQuestion.option_d,
    };

    return (
        <div className="container mx-auto max-w-3xl py-8 px-4 h-full flex flex-col select-none">
            {/* 🔒 Exam Security Banner */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-900 text-white px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-green-400" />
                    <span>Secure Exam Mode</span>
                    {isFullscreen && <span className="text-green-400 text-xs">● Fullscreen</span>}
                </div>
                <div className="flex items-center gap-3">
                    {violations > 0 && (
                        <span className="text-amber-400 font-medium">
                            Violations: {violations}/{maxViolations}
                        </span>
                    )}
                </div>
            </div>

            {/* ⚠️ Warning Toast */}
            {warningMessage && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 animate-pulse">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium">{warningMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{test.title}</h1>
                    <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
                </div>
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono font-medium ${timeLeft < 60 ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-blue-50 text-blue-700'
                    }`}>
                    <Clock className="h-4 w-4" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 h-2 w-full rounded-full bg-gray-200">
                <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Question Card */}
            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg leading-relaxed">
                        {currentQuestion.question_text}
                    </CardTitle>
                    <CardDescription className='font-medium text-blue-600 border-b pb-2 mb-2'>
                        Question {currentQuestionIndex + 1} of {testQuestions.length}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 flex-1">
                    {Object.entries(options).map(([letter, text]) => (
                        <div
                            key={letter}
                            onClick={() => handleOptionSelect(letter)}
                            className={`
                                flex items-center rounded-lg border p-4 cursor-pointer transition-all
                                ${answers[currentQuestion.id] === letter
                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                            `}
                        >
                            <div className={`
                                flex h-6 w-6 items-center justify-center rounded-full border mr-3 text-xs
                                ${answers[currentQuestion.id] === letter
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-400 text-gray-500'}
                            `}>
                                {letter}
                            </div>
                            <span className="text-sm font-medium">{text}</span>
                        </div>
                    ))}
                </CardContent>
                <CardFooter className="justify-between border-t p-6">
                    <Button
                        variant="ghost"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>

                    {currentQuestionIndex === testQuestions.length - 1 ? (
                        <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                            {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Submit Test
                        </Button>
                    ) : (
                        <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(testQuestions.length - 1, prev + 1))}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
