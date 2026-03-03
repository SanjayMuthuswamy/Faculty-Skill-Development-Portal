import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { testsApi, Difficulty } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { PlayCircle, Clock, Award, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function FacultyTests() {
    const { user } = useAuth();
    const navigate = useNavigate();
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

    const filteredTests = Array.isArray(tests) ? tests.filter(test =>
        filterDifficulty === 'ALL' || test.difficulty === filterDifficulty
    ) : [];

    const getTestTitle = (testId?: string) => {
        if (!Array.isArray(tests)) return 'Practice Test';
        return tests.find(t => t.id === testId)?.title || 'Practice Test';
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Practice Tests</h1>
                    <p className="text-gray-500">Assess your skills with our curated question bank</p>
                </div>
                <select
                    className="h-10 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-40"
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value as any)}
                >
                    <option value="ALL">Any Difficulty</option>
                    <option value={Difficulty.BEGINNER}>Beginner</option>
                    <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                    <option value={Difficulty.ADVANCED}>Advanced</option>
                </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoadingTests ? (
                    <p>Loading tests...</p>
                ) : filteredTests?.map((test) => (
                    <Card key={test.id} className="flex flex-col border-l-4 border-l-blue-600">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="outline">{test.domain}</Badge>
                                <Badge variant={test.difficulty === Difficulty.BEGINNER ? 'success' : test.difficulty === Difficulty.INTERMEDIATE ? 'warning' : 'destructive'}>
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

            <div className="mt-12">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Activity
                </h2>
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
                                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                        No attempts yet. Start a test to see your results here.
                                    </TableCell>
                                </TableRow>
                            ) : attempts?.slice().reverse().map((attempt) => (
                                <TableRow key={attempt.id}>
                                    <TableCell className="font-medium">{attempt.test_title || getTestTitle(attempt.test_id)}</TableCell>
                                    <TableCell>{format(new Date(attempt.submitted_at || attempt.started_at), 'MMM d, yyyy h:mm a')}</TableCell>
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
            </div>
        </div>
    );
}
