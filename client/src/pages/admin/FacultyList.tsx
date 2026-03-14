import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyApi } from '../../lib/api/faculty';
import { analyticsApi } from '../../lib/api/analytics';
import { useToast } from '../../components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import {
    Users,
    TrendingUp,
    AlertTriangle,
    ExternalLink,
    Search,
    BrainCircuit,
    Activity,
    Filter,
    BookOpen,
    Sparkles
} from 'lucide-react';

export function FacultyList() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
    const ITEMS_PER_PAGE = 10;
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFaculty, setNewFaculty] = useState({
        name: '',
        email: '',
        department: 'Computer Science',
        designation: 'Assistant Professor',
        experience: 0,
        tempPassword: ''
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => facultyApi.registerFaculty({
            name: data.name,
            email: data.email,
            department: data.department,
            designation: data.designation,
            experience_years: data.experience,
            password: data.tempPassword
        }),
        onSuccess: () => {
            addToast('Faculty member added successfully', 'success');
            setShowAddModal(false);
            setNewFaculty({
                name: '',
                email: '',
                department: 'Computer Science',
                designation: 'Assistant Professor',
                experience: 0,
                tempPassword: ''
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'faculty', 'list'] });
        },
        onError: (error: any) => {
            addToast(error.message || 'Failed to add faculty', 'error');
        }
    });

    const handleAddFaculty = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newFaculty);
    };

    const { data: facultyListData, isLoading: loadingList, error: listError } = useQuery({
        queryKey: ['admin', 'faculty', 'list', currentPage, ITEMS_PER_PAGE, debouncedSearchQuery, deptFilter],
        queryFn: () => facultyApi.listProfilesPaginated({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            search: debouncedSearchQuery || undefined,
            department: deptFilter !== 'All' ? deptFilter : undefined,
        }),
    });

    const { data: departmentSummary } = useQuery({
        queryKey: ['admin', 'dept-summary'],
        queryFn: analyticsApi.getDepartmentSummary,
    });

    const metrics = useMemo(() => {
        if (!departmentSummary) return { progress: 0, verified: 0, attention: 0 };
        const avgProgress = Math.round(departmentSummary.reduce((acc, d) => acc + d.plan_adoption_rate, 0) / (departmentSummary.length || 1));
        const totalVerified = Math.round(departmentSummary.reduce((acc, d) => acc + (d.verified_skills_rate * d.faculty_count / 100), 0));
        const attentionNeeded = departmentSummary.filter(d => d.avg_accuracy < 60).length;
        return { progress: avgProgress, verified: totalVerified, attention: attentionNeeded };
    }, [departmentSummary]);

    const facultyList = facultyListData?.items ?? [];
    const totalPages = facultyListData?.total_pages ?? 1;
    const totalFaculty = facultyListData?.total ?? 0;

    const departments = ['All', ...new Set((departmentSummary ?? []).map((d) => d.department).filter(Boolean) as string[])];

    if (loadingList) {
        return <div className="p-8 flex items-center justify-center h-[400px]"><Activity className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Faculty Performance</h1>
                    <p className="text-gray-500">Monitor individual development and skill verification metrics</p>
                    <div className="mt-4 md:hidden">
                        <Button onClick={() => setShowAddModal(true)} size="sm">
                            <Users className="h-4 w-4 mr-2" /> Add Faculty
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            className="pl-10 pr-8 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none min-w-[140px]"
                            value={deptFilter}
                            onChange={(e) => {
                                setDeptFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="hidden md:flex">
                        <Users className="h-4 w-4 mr-2" /> Add Faculty
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-gray-400">Total Faculty</CardTitle>
                        <Users className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFaculty}</div>
                        <p className="text-[10px] text-gray-500 mt-1">Active instructors</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-gray-400">Avg Progress</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.progress}%</div>
                        <p className="text-[10px] text-gray-500 mt-1">Global roadmap completion</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-gray-400">Verified Skills</CardTitle>
                        <BrainCircuit className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.verified}</div>
                        <p className="text-[10px] text-gray-500 mt-1">Total across all faculty</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-gray-400">Attention Needed</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.attention}</div>
                        <p className="text-[10px] text-gray-500 mt-1">Low engagement indicators</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="pl-6 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">Faculty Details</TableHead>
                                <TableHead className="py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-center">Enrollments</TableHead>
                                <TableHead className="py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-center">Active Plan</TableHead>
                                <TableHead className="py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-center">Accuracy</TableHead>
                                <TableHead className="py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-center">Attempts</TableHead>
                                <TableHead className="py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">AI Recommendation</TableHead>
                                <TableHead className="text-right pr-6 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {facultyList.map((faculty) => (
                                <FacultyRow key={faculty.id} faculty={faculty} onView={() => navigate(`/admin/faculty/${faculty.id}`)} />
                            ))}
                            {facultyList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-gray-500 font-bold italic">
                                        {listError
                                            ? 'Failed to load faculty list from server. Please refresh or re-login.'
                                            : 'No faculty members found matching your criteria.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="pt-0"
                />
            )}

            {/* Add Faculty Modal */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity ${showAddModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 transform transition-all scale-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Add New Faculty</h2>
                        <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleAddFaculty} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newFaculty.name}
                                onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newFaculty.email}
                                onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newFaculty.department}
                                    onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })}
                                >
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Mechanical Engineering">Mechanical</option>
                                    <option value="Civil Engineering">Civil</option>
                                    <option value="Electrical Engineering">Electrical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newFaculty.designation}
                                    onChange={e => setNewFaculty({ ...newFaculty, designation: e.target.value })}
                                >
                                    <option value="Assistant Professor">Asst. Professor</option>
                                    <option value="Associate Professor">Assoc. Professor</option>
                                    <option value="Professor">Professor</option>
                                    <option value="Lecturer">Lecturer</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newFaculty.experience}
                                onChange={e => setNewFaculty({ ...newFaculty, experience: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="Min 6 characters"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newFaculty.tempPassword}
                                onChange={e => setNewFaculty({ ...newFaculty, tempPassword: e.target.value })}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Faculty member will use this for their first login.</p>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Adding...' : 'Add Faculty'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function clampText(input: string, max: number): string {
    const text = (input || '').trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trimEnd()}…`;
}

function getAccuracyTone(accuracy: number): string {
    if (accuracy >= 80) return 'text-emerald-600';
    if (accuracy >= 60) return 'text-blue-600';
    return 'text-amber-600';
}

function FacultyRow({ faculty, onView }: { faculty: any, onView: () => void }) {
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['admin', 'faculty', 'analytics', faculty.id],
        queryFn: () => analyticsApi.getFacultyAnalytics(faculty.id),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });

    const accuracy = Math.round(summary?.avg_accuracy || 0);
    const aiSuggestion = summary?.ai_suggestion
        || summary?.recommendations?.[0]
        || summary?.top_gap
        || '';
    const aiText = aiSuggestion
        ? clampText(aiSuggestion, 110)
        : (loadingSummary ? 'Generating insight...' : 'No AI suggestion available yet');
    const aiSource = summary?.ai_source || (summary?.recommendations?.length ? 'LLM_RECOMMENDATION' : 'RULE_BASED');
    const sourceLabel = aiSource.replace(/_/g, ' ');

    return (
        <TableRow className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <TableCell className="pl-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {faculty.user?.name?.charAt(0) || 'F'}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-none mb-1">{faculty.user?.name || 'Unknown'}</span>
                        <div className="text-[11px] text-slate-500 font-medium mb-1">{faculty.user?.email || 'No email'}</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                            <span>{faculty.department}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{faculty.designation}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="py-5 text-center">
                <div className="inline-flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-700">{faculty.course_enrollments?.length || 0}</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none text-[8px] font-bold uppercase tracking-tighter h-4 gap-1">
                        <BookOpen className="h-2 w-2" /> Courses
                    </Badge>
                </div>
            </TableCell>
            <TableCell className="py-5">
                {summary ? (
                    <div className="flex flex-col gap-1.5 min-w-[140px] px-2 text-center">
                        <span className="text-blue-600 font-black text-[10px]">{Math.round(summary.active_plan_progress)}%</span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${summary.active_plan_progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <span className="text-[10px] text-gray-300 font-bold uppercase italic tracking-widest">Not Started</span>
                    </div>
                )}
            </TableCell>
            <TableCell className="py-5 text-center">
                <div className="flex flex-col items-center">
                    <span className={`text-sm font-black ${getAccuracyTone(accuracy)}`}>
                        {accuracy}%
                    </span>
                    <Badge className="bg-slate-50 text-slate-500 border-none text-[8px] font-bold uppercase tracking-tighter h-4">Avg Score</Badge>
                </div>
            </TableCell>
            <TableCell className="py-5 text-center">
                <div className="inline-flex flex-col items-center">
                    <span className="text-sm font-black text-slate-700">{summary?.attempts_count || 0}</span>
                    <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-bold uppercase tracking-tighter h-4">Tests</Badge>
                </div>
            </TableCell>
            <TableCell className="py-5">
                <div className="flex flex-col gap-1.5 max-w-[300px]">
                    <div className={`text-[11px] leading-snug px-2.5 py-1.5 rounded-lg border ${aiSuggestion ? 'bg-amber-50 border-amber-100 text-amber-800 font-semibold' : 'bg-slate-50 border-slate-100 text-slate-400 italic'}`}>
                        {aiText}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase tracking-widest h-4">
                            <Sparkles className="h-2 w-2" /> {sourceLabel}
                        </Badge>
                        <span className="text-[8px] text-slate-400 uppercase font-semibold tracking-widest">Backend Insight</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right pr-6 py-5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onView}
                    className="h-9 w-9 rounded-xl font-bold flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 group/btn"
                >
                    <ExternalLink className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                </Button>
            </TableCell>
        </TableRow>
    );
}
