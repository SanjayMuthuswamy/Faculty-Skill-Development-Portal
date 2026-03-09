import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiQuestionsApi } from '../../lib/api/aiQuestions';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Sparkles, History, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkillDomain } from '../../lib/api/skills';
import { Difficulty } from '../../lib/api/tests';

export default function AIQuestionGen() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [domain, setDomain] = useState<SkillDomain>(SkillDomain.TECHNOLOGY);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
    const [count, setCount] = useState(5);
    const [prompt, setPrompt] = useState('');

    const { data: drafts } = useQuery({
        queryKey: ['questionDrafts'],
        queryFn: aiQuestionsApi.listBatches,
    });

    const generateMutation = useMutation({
        mutationFn: aiQuestionsApi.generate,
        onSuccess: (newDraft) => {
            addToast('Draft batch generated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['questionDrafts'] });
            navigate(`/admin/draft-review/${newDraft.id}`);
        },
        onError: () => {
            addToast('Failed to generate draft', 'destructive');
        }
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            addToast('Please provide some description or syllabus bullets', 'warning');
            return;
        }
        generateMutation.mutate({
            topic: domain,
            domain: domain,
            difficulty,
            count,
            prompt
        });
    };

    const handleCountChange = (raw: string) => {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isNaN(parsed)) {
            setCount(1);
            return;
        }
        setCount(Math.min(10, Math.max(1, parsed)));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Question Generator</h1>
                    <p className="text-gray-500">Describe a topic and let AI draft MCQ questions for you.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/question-packs')}>
                    View Question Packs
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Generation Parameters
                        </CardTitle>
                        <CardDescription>
                            Provide details to help AI generate context-aware questions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Domain</label>
                                    <select
                                        className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white capitalize"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value as SkillDomain)}
                                    >
                                        <option value={SkillDomain.TEACHING}>Teaching</option>
                                        <option value={SkillDomain.RESEARCH}>Research</option>
                                        <option value={SkillDomain.TECHNOLOGY}>Technology</option>
                                        <option value={SkillDomain.LEADERSHIP}>Leadership</option>
                                        <option value={SkillDomain.COMMUNICATION}>Communication</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Difficulty Level</label>
                                    <select
                                        className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white"
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                                    >
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Number of Questions</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={count}
                                    onChange={(e) => handleCountChange(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Description / Syllabus Bullets</label>
                                <textarea
                                    className="flex min-h-[120px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    placeholder="e.g. Normalization, BCNF, Relational Algebra, and Transaction Management..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">Describe the specific areas you want the questions to cover.</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        AI Drafting Questions...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Generate Draft Questions
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-gray-500" />
                                Recent Draft batches
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            <div className="divide-y">
                                {!drafts || drafts.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        No recent drafts found.
                                    </div>
                                ) : (
                                    drafts.slice().reverse().slice(0, 5).map((draft) => (
                                        <div
                                            key={draft.id}
                                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                                            onClick={() => navigate(`/admin/draft-review/${draft.id}`)}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="font-medium text-sm truncate">{draft.topic}</p>
                                                <p className="text-xs text-gray-500">
                                                    {draft.questions.length} Questions • {draft.difficulty}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                            <h4 className="font-bold text-blue-900 mb-2">How it works</h4>
                            <ul className="text-sm text-blue-800 space-y-2">
                                <li className="flex gap-2">
                                    <span className="font-bold text-blue-600">1.</span>
                                    AI generates questions based on your description.
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold text-blue-600">2.</span>
                                    Questions are saved as a "Draft Batch".
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold text-blue-600">3.</span>
                                    You review/edit each question.
                                </li>
                                <li className="flex gap-2">
                                    <span className="font-bold text-blue-600">4.</span>
                                    Approved questions are published to a Question Pack.
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
