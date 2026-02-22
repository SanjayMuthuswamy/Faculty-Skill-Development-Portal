import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { practiceSetsApi } from '../../lib/api/practiceSets';
import { SkillDomain } from '../../lib/api/skills';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
    PlayCircle,
    Clock,
    Award,
    History,
    ArrowRight,
    Sparkles,
    ClipboardList,
    Target,
    Zap,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

type TabType = 'tests' | 'sandbox' | 'attempts';

export default function Practice() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('tests');
    const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'>('ALL');

    // AI Sandbox Form State
    const [sandboxDomain, setSandboxDomain] = useState<SkillDomain>(SkillDomain.AI);
    const [sandboxDifficulty, setSandboxDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [sandboxCount, setSandboxCount] = useState<number>(10);
    const [sandboxSource, setSandboxSource] = useState<'WEAKNESS' | 'CUSTOM' | 'PACK'>('PACK');
    const [sandboxTopic, setSandboxTopic] = useState<string>('');

    const { data: tests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['tests'],
        queryFn: () => testsApi.listTests(),
    });

    const { data: attempts } = useQuery({
        queryKey: ['attempts', user?.id],
        queryFn: attemptsApi.getMyAttempts,
        enabled: !!user,
    });

    const { data: aiSets } = useQuery({
        queryKey: ['ai-practice-sets', user?.id],
        queryFn: practiceSetsApi.listMySets,
        enabled: !!user && activeTab === 'sandbox',
    });

    const generateMutation = useMutation({
        mutationFn: practiceSetsApi.generate,
        onSuccess: (newSet) => {
            queryClient.invalidateQueries({ queryKey: ['ai-practice-sets'] });
            navigate(`/faculty/practice/play/${newSet.id}`);
        }
    });

    const filteredTests = Array.isArray(tests) ? tests.filter(test =>
        filterDifficulty === 'ALL' || test.difficulty === filterDifficulty
    ) : [];

    const getTestTitle = (testId?: string) => {
        if (!Array.isArray(tests)) return 'Practice Session';
        return tests.find(t => t.id === testId)?.title || 'Practice Session';
    };

    const handleGenerate = () => {
        if (!user) return;
        generateMutation.mutate({
            domain: sandboxDomain,
            difficulty: sandboxDifficulty,
            count: sandboxCount,
            source: sandboxSource,
            topic: sandboxTopic
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Practice Dashboard</h1>
                    <p className="text-gray-500">Master your domains through structured tests and AI-powered practice</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 w-full max-w-md">
                <button
                    onClick={() => setActiveTab('tests')}
                    className={cn(
                        "flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all",
                        activeTab === 'tests'
                            ? "bg-white text-blue-700 shadow"
                            : "text-gray-600 hover:bg-white/[0.12] hover:text-blue-600"
                    )}
                >
                    <ClipboardList className="h-4 w-4" />
                    Official Tests
                </button>
                <button
                    onClick={() => setActiveTab('sandbox')}
                    className={cn(
                        "flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all",
                        activeTab === 'sandbox'
                            ? "bg-white text-blue-700 shadow"
                            : "text-gray-600 hover:bg-white/[0.12] hover:text-blue-600"
                    )}
                >
                    <Sparkles className="h-4 w-4" />
                    AI Sandbox
                </button>
                <button
                    onClick={() => setActiveTab('attempts')}
                    className={cn(
                        "flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all",
                        activeTab === 'attempts'
                            ? "bg-white text-blue-700 shadow"
                            : "text-gray-600 hover:bg-white/[0.12] hover:text-blue-600"
                    )}
                >
                    <Activity className="h-4 w-4" />
                    History
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'tests' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <select
                                className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-40"
                                value={filterDifficulty}
                                onChange={(e) => setFilterDifficulty(e.target.value as any)}
                            >
                                <option value="ALL">Any Difficulty</option>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {isLoadingTests ? (
                                <p>Loading tests...</p>
                            ) : filteredTests?.map((test) => (
                                <Card key={test.id} className="flex flex-col border-l-4 border-l-blue-600 hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline">{test.domain}</Badge>
                                            <Badge variant={test.difficulty === 'EASY' ? 'success' : test.difficulty === 'MEDIUM' ? 'warning' : test.difficulty === 'HARD' ? 'destructive' : 'secondary'}>
                                                {test.difficulty}
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-2 text-lg">{test.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>{test.time_limit_minutes} mins</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Award className="h-4 w-4" />
                                                <span>Pass: {test.pass_marks}%</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="p-6 pt-0 mt-auto">
                                        <Button className="w-full" onClick={() => navigate(`/faculty/tests/${test.id}/play`)}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Start Test
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'sandbox' && (
                    <div className="grid gap-8 md:grid-cols-3">
                        <Card className="md:col-span-1 border-t-4 border-t-indigo-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-indigo-600" />
                                    Practice Generator
                                </CardTitle>
                                <CardDescription>Instant personalized MCQs based on your needs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Domain</label>
                                    <select
                                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                        value={sandboxDomain}
                                        onChange={(e) => setSandboxDomain(e.target.value as SkillDomain)}
                                    >
                                        <option value={SkillDomain.AI}>Artificial Intelligence</option>
                                        <option value={SkillDomain.CLOUD}>Cloud Computing</option>
                                        <option value={SkillDomain.DATA}>DBMS & Analytics</option>
                                        <option value={SkillDomain.CYBER}>Cybersecurity</option>
                                        <option value={SkillDomain.TEACHING}>Teaching Pedagogy</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Practice Mode</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: 'PACK', label: 'Pack-based', desc: 'From approved question packs' },
                                            { id: 'WEAKNESS', label: 'Weakness-based', desc: 'Focus on recent errors' },
                                            { id: 'CUSTOM', label: 'Custom Topic', desc: 'Specify keyword below' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setSandboxSource(mode.id as any)}
                                                className={cn(
                                                    "text-left p-3 rounded-md border transition-all hover:bg-gray-50",
                                                    sandboxSource === mode.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200"
                                                )}
                                            >
                                                <div className="text-sm font-semibold">{mode.label}</div>
                                                <div className="text-xs text-gray-500">{mode.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {sandboxSource === 'CUSTOM' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Specific Topic</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Neural Networks"
                                            className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            value={sandboxTopic}
                                            onChange={(e) => setSandboxTopic(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Difficulty</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                            value={sandboxDifficulty}
                                            onChange={(e) => setSandboxDifficulty(e.target.value as any)}
                                        >
                                            <option value="EASY">Easy</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HARD">Hard</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Count</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                            value={sandboxCount}
                                            onChange={(e) => setSandboxCount(Number(e.target.value))}
                                        >
                                            <option value={5}>5 Qs</option>
                                            <option value={10}>10 Qs</option>
                                            <option value={15}>15 Qs</option>
                                        </select>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                                    onClick={handleGenerate}
                                    disabled={generateMutation.isPending}
                                >
                                    {generateMutation.isPending ? "Analysing topics..." : "Generate Practice Set"}
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="md:col-span-2 space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Target className="h-5 w-5 text-gray-400" />
                                Your AI Practice Sets
                            </h3>

                            {aiSets?.length === 0 ? (
                                <Card className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <Sparkles className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <CardTitle className="text-lg">No AI Practice Sets Yet</CardTitle>
                                    <CardDescription className="max-w-xs mx-auto mt-2">
                                        Use the generator on the left to create custom practice sets based on your weak areas.
                                    </CardDescription>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {aiSets?.slice().reverse().map(set => (
                                        <Card key={set.id} className="overflow-hidden">
                                            <div className="flex items-center p-4">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mr-4">
                                                    <Sparkles className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold">{set.domain} Practice - {set.source}</h4>
                                                        <Badge variant="outline">{format(new Date(set.created_at), 'MMM d, h:mm a')}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs text-gray-500">{set.questions.length} Questions</span>
                                                        <span className="text-xs text-gray-500 capitalize">{set.difficulty.toLowerCase()}</span>
                                                        {set.completed_at && (
                                                            <span className={cn(
                                                                "text-xs font-bold",
                                                                (set.accuracy || 0) >= 70 ? "text-green-600" : "text-amber-600"
                                                            )}>
                                                                Score: {set.score}/{set.questions.length} ({set.accuracy}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/faculty/practice/play/${set.id}`)}
                                                    >
                                                        {set.completed_at ? "Review" : "Start"} <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {set.source === 'PACK' && set.completed_at && (set.accuracy || 0) >= 70 && (
                                                <div className="bg-green-50 px-4 py-1.5 border-t border-green-100 flex items-center gap-2">
                                                    <Badge variant="success" className="text-[10px] h-4">VERIFIED PROGRESS</Badge>
                                                    <span className="text-[10px] text-green-700">This set counts toward your skill validation.</span>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'attempts' && (
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attempts?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <History className="h-8 w-8 text-gray-200 mb-2" />
                                                <p>No attempts yet. Start a test to see your results here.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : attempts?.slice().reverse().map((attempt) => (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.test_title || getTestTitle(attempt.test_id)}</TableCell>
                                        <TableCell>{format(new Date(attempt.completed_at), 'MMM d, yyyy h:mm a')}</TableCell>
                                        <TableCell>
                                            <span className={(attempt.accuracy || 0) >= 70 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                                {Math.round(attempt.accuracy || 0)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={'default'}>
                                                Completed
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(attempt.test_id ? `/faculty/tests/${attempt.test_id}/result/${attempt.id}` : '#')}
                                            >
                                                View Result <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </div>
    );
}
