import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
// testsApi removed here
import { practiceSetsApi } from '../../lib/api/practiceSets';
import { SkillDomain } from '../../lib/api/skills';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Sparkles,
    Zap,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
// Pagination removed here

type TabType = 'sandbox' | 'attempts';

export default function Practice() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('sandbox');

    // AI Sandbox Form State
    const [sandboxDomain, setSandboxDomain] = useState<SkillDomain>(SkillDomain.AI);
    const [sandboxDifficulty, setSandboxDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [sandboxCount, setSandboxCount] = useState<number>(10);
    const [sandboxSource, setSandboxSource] = useState<'WEAKNESS' | 'CUSTOM' | 'PACK'>('PACK');
    const [sandboxTopic, setSandboxTopic] = useState<string>('');

    // Pagination State (removed as unused, or kept if AI sets get paginated later)
    // Removed unused historyPage and ITEMS_PER_PAGE for now as AI tests are not currently paginated.

    // Removed official tests and attempts queries

    const { data: aiSets } = useQuery({
        queryKey: ['ai-practice-sets', user?.id],
        queryFn: practiceSetsApi.listMySets,
        enabled: !!user,
    });

    const generateMutation = useMutation({
        mutationFn: practiceSetsApi.generate,
        onSuccess: (newSet) => {
            queryClient.invalidateQueries({ queryKey: ['ai-practice-sets'] });
            navigate(`/faculty/practice/play/${newSet.id}`);
        }
    });

    // Removed getTestTitle and filteredTests

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
                    <h1 className="text-3xl font-bold tracking-tight">Tests Dashboard</h1>
                    <p className="text-gray-500">Master your domains through structured tests and AI-powered practice</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 w-full max-md:max-w-md">
                {/* Removed Official Tests Tab */}
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
                    AI Practice Tests
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
                {/* Removed Official Tests Tab Content */}

                {activeTab === 'sandbox' && (
                    <div className="flex justify-center">
                        <Card className="w-full max-w-2xl border-t-4 border-t-indigo-600">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-indigo-600" />
                                    Test Generator
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
                                    <label className="text-sm font-medium">Test Mode</label>
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
                                    {generateMutation.isPending ? "Analysing topics..." : "Generate Test Set"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'attempts' && (
                    <div className="space-y-8">
                        {/* ── AI Practice Test Results ── */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-lg font-bold text-slate-800">AI Practice Test Results</h2>
                                <span className="ml-1 text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{aiSets?.filter(s => s.completed_at)?.length || 0}</span>
                            </div>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test Set</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Accuracy</TableHead>
                                            <TableHead>Difficulty</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!aiSets?.some(s => s.completed_at) ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                                                    <div className="flex flex-col items-center">
                                                        <Sparkles className="h-8 w-8 text-gray-200 mb-2" />
                                                        <p>No AI practice test results yet.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : aiSets?.filter(s => s.completed_at).slice().reverse().map((set) => (
                                            <TableRow key={set.id}>
                                                <TableCell className="font-medium">{set.domain} – {set.source}</TableCell>
                                                <TableCell>{set.completed_at && format(new Date(set.completed_at), 'MMM d, yyyy')}</TableCell>
                                                <TableCell>{set.score}/{set.questions.length}</TableCell>
                                                <TableCell>
                                                    <span className={(set.accuracy || 0) >= 70 ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                                                        {set.accuracy}%
                                                    </span>
                                                </TableCell>
                                                <TableCell><Badge variant="outline" className="capitalize">{set.difficulty.toLowerCase()}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm"
                                                        onClick={() => navigate(`/faculty/practice/play/${set.id}`)}>
                                                        Review <ArrowRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
