import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, XCircle, ChevronLeft, Loader2, Clock } from 'lucide-react';

export default function TestResult() {
    const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
    const navigate = useNavigate();
    // const { user } = useAuth(); // Unused

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

    // Map answers list to record for easy lookup
    const answersRecord = useMemo(() => {
        const record: Record<string, string> = {};
        attempt?.answers?.forEach(a => {
            record[a.question_id] = a.selected_option;
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
        <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/faculty/tests')}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Tests
                </Button>
            </div>

            <Card className={`border-t-8 ${passed ? 'border-t-green-600' : 'border-t-red-600'}`}>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl mb-2">Test Results: {test.title}</CardTitle>
                    <div className="flex justify-center items-center gap-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Score</p>
                            <p className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{Math.round(attempt.accuracy || 0)}%</p>
                        </div>
                        <div className="h-12 w-px bg-gray-200" />
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Result</p>
                            <Badge className="text-lg px-4 py-1" variant={passed ? 'success' : 'destructive'}>
                                {passed ? 'PASSED' : 'FAILED'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Performance Summary Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-blue-600">Total Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold">{attempt.total}</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-100">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-green-600">Correct</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold">{attempt.correct_count}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-red-100">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-red-600">Incorrect</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold">{attempt.incorrect_count}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-50/50 border-gray-200">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-gray-600">Unanswered</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                        <p className="text-2xl font-bold">{attempt.unanswered_count}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white border-gray-200">
                <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Time Taken:</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                        {Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s
                    </span>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Question Review</h3>
                {testQuestions.map((question, index) => {
                    const selectedOptionLetter = answersRecord[question.id]?.trim()?.toUpperCase();
                    const isCorrect = selectedOptionLetter === question.correct_option;

                    const options = {
                        'A': question.option_a,
                        'B': question.option_b,
                        'C': question.option_c,
                        'D': question.option_d,
                    };

                    const optionEntries = Object.entries(options);

                    return (
                        <Card key={question.id} className={isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium text-gray-500">Question {index + 1}</span>
                                    {isCorrect ? (
                                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Correct</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Incorrect</Badge>
                                    )}
                                </div>
                                <CardTitle className="text-base mt-2">{question.question_text}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {optionEntries.map(([letter, text]) => {
                                        const isSelected = selectedOptionLetter === letter;
                                        const isAnswer = question.correct_option === letter;

                                        let style = "p-3 rounded-md border text-sm ";
                                        if (isAnswer) style += "bg-green-100 border-green-300 text-green-900 font-medium";
                                        else if (isSelected && !isAnswer) style += "bg-red-50 border-red-300 text-red-900";
                                        else style += "bg-white border-gray-200 text-gray-700";

                                        return (
                                            <div key={letter} className={style}>
                                                <div className="flex items-center">
                                                    <div className={`
                                                        flex h-5 w-5 items-center justify-center rounded-full border mr-3 text-[10px]
                                                        ${isSelected ? 'bg-current text-white border-transparent' : 'border-gray-300'}
                                                    `}>
                                                        <span className={isSelected ? 'text-white' : 'text-gray-500'}>{letter}</span>
                                                    </div>
                                                    {isAnswer && <CheckCircle className="mr-2 h-4 w-4 text-green-600 shrink-0" />}
                                                    {isSelected && !isAnswer && <XCircle className="mr-2 h-4 w-4 text-red-600 shrink-0" />}
                                                    <span className="flex-1">{text}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 text-blue-900 rounded-md text-sm">
                                    <span className="font-semibold">Explanation:</span> {question.explanation}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
