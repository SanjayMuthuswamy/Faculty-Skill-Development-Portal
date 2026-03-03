import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyApi } from '../../lib/api/faculty';
import { analyticsApi } from '../../lib/api/analytics';
import { useToast } from '../../components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import {
    Users,
    TrendingUp,
    AlertTriangle,
    ExternalLink,
    Search,
    BrainCircuit,
    Activity,
    Filter
} from 'lucide-react';

export function FacultyList() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
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

    const { data: facultyList, isLoading: loadingList } = useQuery({
        queryKey: ['admin', 'faculty', 'list'],
        queryFn: () => facultyApi.listProfiles(),
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

    const filteredFaculty = facultyList?.filter(f => {
        const matchesSearch = (f.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === 'All' || f.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    const departments = ['All', ...new Set(facultyList?.map(f => f.department).filter(Boolean) as string[])];

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
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            className="pl-10 pr-8 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none min-w-[140px]"
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
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
                        <div className="text-2xl font-bold">{facultyList?.length || 0}</div>
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
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead className="pl-6 py-4 font-bold text-gray-600">Faculty Details</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Active Plan</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Accuracy</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Attempts</TableHead>
                                <TableHead className="py-4 font-bold text-gray-600">Gap/Weakness</TableHead>
                                <TableHead className="text-right pr-6 py-4 font-bold text-gray-600">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFaculty?.map((faculty) => (
                                <FacultyRow key={faculty.id} faculty={faculty} onView={() => navigate(`/admin/faculty/${faculty.id}`)} />
                            ))}
                            {filteredFaculty?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                        No faculty members found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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

function FacultyRow({ faculty, onView }: { faculty: any, onView: () => void }) {
    const { data: summary } = useQuery({
        queryKey: ['admin', 'faculty', 'analytics', faculty.id],
        queryFn: () => analyticsApi.getFacultyAnalytics(faculty.id),
    });

    return (
        <TableRow className="group hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
            <TableCell className="pl-6 py-4">
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{faculty.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-500">{faculty.department} • {faculty.designation}</span>
                </div>
            </TableCell>
            <TableCell className="py-4">
                {summary ? (
                    <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-gray-400">Active Plan</span>
                            <span className="text-blue-600 font-black">{Math.round(summary.active_plan_progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                style={{ width: `${summary.active_plan_progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-gray-400 italic">No active plan</span>
                )}
            </TableCell>
            <TableCell className="py-4">
                <div className="flex flex-col">
                    <span className={`text-sm font-bold ${summary && summary.avg_accuracy >= 80 ? 'text-emerald-600' : summary && summary.avg_accuracy >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {Math.round(summary?.avg_accuracy || 0)}%
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-black">Practice Score</span>
                </div>
            </TableCell>
            <TableCell className="py-4">
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700">{summary?.attempts_count || 0}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-black">Evaluations</span>
                </div>
            </TableCell>
            <TableCell className="py-4">
                <div className="flex flex-col gap-0.5">
                    <span className={`text-[11px] font-black leading-tight truncate max-w-[140px] px-2 py-0.5 rounded-md w-fit ${summary?.top_gap ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-50 text-gray-400 italic'}`}>
                        {summary?.top_gap || 'Analysis pending...'}
                    </span>
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest pl-0.5">AI Insights</span>
                </div>
            </TableCell>
            <TableCell className="text-right pr-6 py-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onView}
                    className="h-8 rounded-lg font-bold text-xs gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm active:scale-95"
                >
                    Analyze <ExternalLink className="h-3 w-3" />
                </Button>
            </TableCell>
        </TableRow>
    );
}
