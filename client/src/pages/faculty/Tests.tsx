import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { testsApi, Difficulty } from '../../lib/api/tests';
import { attemptsApi, Attempt } from '../../lib/api/attempts';
import { practiceSetsApi } from '../../lib/api/practiceSets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { PlayCircle, Clock, Award, History, Search, Filter, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Pagination } from '../../components/ui/Pagination';
import { cn } from '../../lib/utils';

export default function FacultyTests() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'tests';

    const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | Difficulty>('ALL');

    const { data: tests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['tests'],
        queryFn: () => testsApi.listTests(),
    });

    const { data: attempts } = useQuery({
        queryKey: ['attempts', user?.id],
        queryFn: attemptsApi.getMyAttempts,
        enabled: !!user,
    });

    const { data: practiceSets } = useQuery({
        queryKey: ['practice-sets', user?.id],
        queryFn: practiceSetsApi.listMySets,
        enabled: !!user,
    });

    const [testsPage, setTestsPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [practiceHistoryPage, setPracticeHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const filteredTests = Array.isArray(tests) ? tests.filter(test =>
        filterDifficulty === 'ALL' || test.difficulty === filterDifficulty
    ) : [];

    const submittedAttempts = useMemo(
        () => (attempts || []).filter((a) => Boolean(a.submitted_at)),
        [attempts]
    );

    const testsById = useMemo(() => {
        const map = new Map<string, (typeof filteredTests)[number]>();
        (tests || []).forEach((t) => map.set(t.id, t));
        return map;
    }, [tests]);

    const getAttemptPassMarks = (attempt: Attempt) => {
        if (!attempt.test_id) return 70;
        return testsById.get(attempt.test_id)?.pass_marks ?? 70;
    };

    const isAttemptPassed = (attempt: Attempt) => (attempt.accuracy || 0) >= getAttemptPassMarks(attempt);

    const completionByTestId = useMemo(() => {
        const byTest = new Map<string, Attempt[]>();
        submittedAttempts.forEach((attempt) => {
            if (!attempt.test_id) return;
            const items = byTest.get(attempt.test_id) || [];
            items.push(attempt);
            byTest.set(attempt.test_id, items);
        });

        const completion = new Map<string, {
            latestAttempt?: Attempt;
            latestPassedAttempt?: Attempt;
            passed: boolean;
            attemptsCount: number;
        }>();

        const byLatest = (a: Attempt, b: Attempt) =>
            new Date(b.submitted_at || b.started_at).getTime() - new Date(a.submitted_at || a.started_at).getTime();

        (tests || []).forEach((test) => {
            const attemptsForTest = (byTest.get(test.id) || []).slice().sort(byLatest);
            const latestAttempt = attemptsForTest[0];
            const passedAttempts = attemptsForTest.filter((a) => (a.accuracy || 0) >= test.pass_marks);

            completion.set(test.id, {
                latestAttempt,
                latestPassedAttempt: passedAttempts[0],
                passed: passedAttempts.length > 0,
                attemptsCount: attemptsForTest.length,
            });
        });

        return completion;
    }, [submittedAttempts, tests]);

    const getTestTitle = (testId?: string) => {
        if (!Array.isArray(tests)) return 'Official Test';
        return tests.find(t => t.id === testId)?.title || 'Official Test';
    };

    const pagedTests = filteredTests.slice((testsPage - 1) * ITEMS_PER_PAGE, testsPage * ITEMS_PER_PAGE);

    // Completed practice sets only
    const completedPracticeSets = practiceSets?.filter(s => s.completed_at) || [];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {activeTab === 'results' ? 'My Test Results' : 'Official Practice Tests'}
                    </h1>
                    <p className="text-gray-500">
                        {activeTab === 'results'
                            ? 'Review your performance across official tests and AI practice tests.'
                            : 'Assess your skills with our curated official question bank'}
                    </p>
                </div>
                {activeTab !== 'results' && (
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                                className="h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 w-44 font-medium"
                                value={filterDifficulty}
                                onChange={(e) => {
                                    setFilterDifficulty(e.target.value as any);
                                    setTestsPage(1);
                                }}
                            >
                                <option value="ALL">All Levels</option>
                                <option value={Difficulty.BEGINNER}>Beginner</option>
                                <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                                <option value={Difficulty.ADVANCED}>Advanced</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {activeTab !== 'results' && (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {isLoadingTests ? (
                            <div className="col-span-full py-12 flex justify-center">
                                <p className="text-slate-500 animate-pulse">Loading tests...</p>
                            </div>
                        ) : pagedTests?.length === 0 ? (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                                <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">No tests found for the selected filter.</p>
                            </div>
                        ) : pagedTests?.map((test) => {
                            const completion = completionByTestId.get(test.id);
                            const isCompleted = Boolean(completion?.passed);
                            const latestPassed = completion?.latestPassedAttempt;
                            const latestAttempt = completion?.latestAttempt;

                            return (
                            <Card key={test.id} className="flex flex-col border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
                                <div className="h-1.5 w-full bg-blue-600" />
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{test.domain}</Badge>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={cn(
                                                    "capitalize",
                                                    test.difficulty === Difficulty.BEGINNER ? 'bg-green-50 text-green-700 border-green-100' :
                                                        test.difficulty === Difficulty.INTERMEDIATE ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-rose-50 text-rose-700 border-rose-100'
                                                )}
                                            >
                                                {test.difficulty.toLowerCase()}
                                            </Badge>
                                            {isCompleted && (
                                                <Badge className="bg-emerald-600 text-white border-none">Completed</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl leading-tight text-slate-900">{test.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px] mt-1 text-slate-500">{test.short_description || test.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 pb-6">
                                    <div className="flex items-center gap-5 text-sm text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1 rounded-md bg-slate-100">
                                                <Clock className="h-3.5 w-3.5 text-slate-600" />
                                            </div>
                                            <span>{test.time_limit_minutes} mins</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1 rounded-md bg-slate-100">
                                                <Award className="h-3.5 w-3.5 text-slate-600" />
                                            </div>
                                            <span>Pass: {test.pass_marks}%</span>
                                        </div>
                                    </div>
                                    {latestPassed && (
                                        <p className="mt-3 text-xs font-semibold text-emerald-700">
                                            Passed on {format(new Date(latestPassed.submitted_at || latestPassed.started_at), 'MMM d, yyyy')} ({Math.round(latestPassed.accuracy || 0)}%)
                                        </p>
                                    )}
                                    {!latestPassed && latestAttempt && (
                                        <p className="mt-3 text-xs font-semibold text-slate-500">
                                            Last attempt: {Math.round(latestAttempt.accuracy || 0)}%
                                        </p>
                                    )}
                                </CardContent>
                                <div className="p-6 pt-0 mt-auto space-y-2">
                                    <Button
                                        className={cn(
                                            "w-full rounded-xl py-6 font-bold",
                                            isCompleted
                                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                                                : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                                        )}
                                        onClick={() => {
                                            if (isCompleted && latestPassed?.id) {
                                                navigate(`/faculty/tests/${test.id}/result/${latestPassed.id}`);
                                                return;
                                            }
                                            navigate(`/faculty/tests/${test.id}/play`);
                                        }}
                                    >
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                        {isCompleted ? 'View Completed Result' : 'Start Test'}
                                    </Button>
                                    {isCompleted && (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-xl py-5 font-semibold border-slate-200"
                                            onClick={() => navigate(`/faculty/tests/${test.id}/play`)}
                                        >
                                            Retake Test
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        )})}
                    </div>

                    {filteredTests.length > ITEMS_PER_PAGE && (
                        <Pagination
                            currentPage={testsPage}
                            totalPages={Math.ceil(filteredTests.length / ITEMS_PER_PAGE)}
                            onPageChange={setTestsPage}
                        />
                    )}
                </div>
            )}

            {activeTab === 'results' && (
                <div className={cn("mt-4 space-y-12")}>
                    {/* Official Test Results Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-50">
                                <Award className="h-5 w-5 text-blue-600" />
                            </div>
                            Official Test Results
                        </h2>
                        <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 py-4">Test Name</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Date</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Score</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Accuracy</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 py-4">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submittedAttempts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-16 text-slate-400 border-none">
                                                <div className="flex flex-col items-center">
                                                    <History className="h-10 w-10 opacity-20 mb-3" />
                                                    <p className="font-medium">No official attempts yet.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : submittedAttempts.slice().reverse().slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE).map((attempt) => (
                                        <TableRow key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-bold text-slate-900">{attempt.test_title || getTestTitle(attempt.test_id)}</TableCell>
                                            <TableCell className="text-slate-500 font-medium">{format(new Date(attempt.submitted_at || attempt.started_at), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "font-bold",
                                                    isAttemptPassed(attempt) ? 'text-green-600' : 'text-rose-600'
                                                )}>
                                                    {attempt.score}/{attempt.total}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "font-bold uppercase tracking-widest text-[9px] h-6 px-2 shadow-sm border-none",
                                                    isAttemptPassed(attempt) ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                                )}>
                                                    {Math.round(attempt.accuracy || 0)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {attempt.test_id && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                                        onClick={() => navigate(`/faculty/tests/${attempt.test_id}/result/${attempt.id}`)}
                                                    >
                                                        View Details
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                        {submittedAttempts.length > ITEMS_PER_PAGE && (
                            <Pagination
                                currentPage={historyPage}
                                totalPages={Math.ceil(submittedAttempts.length / ITEMS_PER_PAGE)}
                                onPageChange={setHistoryPage}
                            />
                        )}
                    </div>

                    {/* AI Practice Test Results Section */}
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-50">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                            </div>
                            AI Practice Test Results
                        </h2>
                        <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 py-4">Topic / Domain</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Date</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Score</TableHead>
                                        <TableHead className="font-bold text-slate-700 py-4">Accuracy</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {completedPracticeSets?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-16 text-slate-400 border-none">
                                                <div className="flex flex-col items-center">
                                                    <Sparkles className="h-10 w-10 opacity-20 mb-3" />
                                                    <p className="font-medium">No AI practice tests completed yet.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : completedPracticeSets?.slice().reverse().slice((practiceHistoryPage - 1) * ITEMS_PER_PAGE, practiceHistoryPage * ITEMS_PER_PAGE).map((practice) => (
                                        <TableRow key={practice.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{practice.topic || `${practice.domain} Practice`}</span>
                                                    <span className="text-xs text-slate-500 capitalize">{practice.difficulty}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 font-medium">{format(new Date(practice.completed_at!), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "font-bold",
                                                    (practice.accuracy || 0) >= 70 ? 'text-green-600' : 'text-rose-600'
                                                )}>
                                                    {practice.score}/{practice.questions?.length || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "font-bold uppercase tracking-widest text-[9px] h-6 px-2 shadow-sm border-none",
                                                    (practice.accuracy || 0) >= 70 ? 'bg-indigo-500 text-white' : 'bg-slate-500 text-white'
                                                )}>
                                                    {Math.round(practice.accuracy || 0)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                        {completedPracticeSets.length > ITEMS_PER_PAGE && (
                            <Pagination
                                currentPage={practiceHistoryPage}
                                totalPages={Math.ceil(completedPracticeSets.length / ITEMS_PER_PAGE)}
                                onPageChange={setPracticeHistoryPage}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
