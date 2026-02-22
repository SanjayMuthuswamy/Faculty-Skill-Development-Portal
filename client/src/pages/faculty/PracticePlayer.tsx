import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { practiceSetsApi } from '../../lib/api/practiceSets';
import { Button } from '../../components/ui/Button'; import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export default function PracticePlayer() {
    const { setId } = useParams<{ setId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = useState(false);

    const { data: currentSet, isLoading } = useQuery({
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
            addToast('Practice set completed!', 'success');
            setIsFinished(true);
        }
    });

    if (isLoading || !currentSet) {
        return (
            <div className="flex bg-gray-50 h-[400px] items-center justify-center p-8">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium tracking-tight">Loading AI Practice Set...</p>
                </div>
            </div>
        );
    }

    const questions = currentSet.questions;
    const currentQuestion = questions[currentIdx];
    const options = {
        'A': currentQuestion.option_a,
        'B': currentQuestion.option_b,
        'C': currentQuestion.option_c,
        'D': currentQuestion.option_d
    };
    const progress = ((currentIdx + 1) / questions.length) * 100;

    const handleSelect = (option: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
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
        return (
            <div className="container mx-auto max-w-2xl py-12 px-4">
                <Card className="text-center p-8 border-t-4 border-t-green-500">
                    <div className="mb-4 flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl mb-2">Practice Complete!</CardTitle>
                    <div className="text-5xl font-bold text-gray-900 my-6">
                        {score}%
                    </div>
                    <p className="text-gray-500 mb-8">
                        You got {questions.filter(q => answers[q.id] === q.correct_option).length} out of {questions.length} questions correct.
                        {score >= 70 && currentSet.source !== 'CUSTOM' && (
                            <span className="block mt-2 font-medium text-green-600">
                                This counts toward your skill verification!
                            </span>
                        )}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => setIsFinished(false)}>Review Answers</Button>
                        <Button onClick={() => navigate('/faculty/practice')}>Back to Dashboard</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl py-8 px-4 h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <h1 className="text-xl font-bold tracking-tight">AI Practice Sandbox</h1>
                    </div>
                    <p className="text-sm text-gray-500">{currentSet.domain} • {currentSet.difficulty}</p>
                </div>
                <div className="text-sm font-medium text-gray-500">
                    Question {currentIdx + 1} of {questions.length}
                </div>
            </div>

            <div className="mb-6 h-2 w-full rounded-full bg-gray-200">
                <div
                    className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200">
                            {currentSet.source} MODE
                        </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                        {currentQuestion.question_text}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 overflow-y-auto">
                    {Object.entries(options).map(([letter, text]) => (
                        <div
                            key={letter}
                            onClick={() => handleSelect(letter)}
                            className={cn(
                                "flex items-center rounded-lg border p-4 cursor-pointer transition-all",
                                answers[currentQuestion.id] === letter
                                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                            )}
                        >
                            <div className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full border mr-3 text-xs font-bold",
                                answers[currentQuestion.id] === letter
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-gray-400 text-gray-500"
                            )}>
                                {letter}
                            </div>
                            <span className="text-sm font-medium">{text}</span>
                        </div>
                    ))}
                </CardContent>

                <CardFooter className="justify-between border-t p-6">
                    <Button
                        variant="ghost"
                        onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                        disabled={currentIdx === 0}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>

                    {currentIdx === questions.length - 1 ? (
                        <Button onClick={handleFinish} disabled={submitMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Finish Practice
                        </Button>
                    ) : (
                        <Button onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1 underline">EXPERIMENTAL: AI PRACTICE ONLY</p>
                    These questions are generated to help you practice and identify weak spots.
                    While based on verified patterns, please cross-reference with official resources
                    for critical learning points.
                </div>
            </div>
        </div>
    );
}
