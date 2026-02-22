import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { facultyApi } from '../../lib/api/faculty';
import { analyticsApi } from '../../lib/api/analytics';
import { attemptsApi } from '../../lib/api/attempts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
    ChevronLeft,
    Download,
    Calendar,
    Mail,
    Briefcase,
    Target,
    Activity,
    Award,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    Eye,
    BrainCircuit,
    Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function FacultyDetail() {
    const { facultyId } = useParams();
    const navigate = useNavigate();
    const [domainFilter, setDomainFilter] = useState('All');

    // Queries
    const { data: faculty, isLoading: loadingFaculty } = useQuery({
        queryKey: ['admin', 'faculty', 'detail', facultyId],
        queryFn: () => facultyApi.getProfile(facultyId!),
        enabled: !!facultyId
    });

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['admin', 'faculty', 'analytics', facultyId],
        queryFn: () => analyticsApi.getFacultyAnalytics(facultyId!),
        enabled: !!facultyId
    });

    const { data: attempts, isLoading: loadingAttempts } = useQuery({
        queryKey: ['admin', 'faculty', 'attempts', facultyId],
        queryFn: () => attemptsApi.getFacultyAttempts(facultyId!),
        enabled: !!facultyId
    });

    const handleExport = async () => {
        if (!facultyId) return;
        // Mock export for now as generic export is not in backend yet
        const csv = `Date,Test,Domain,Score,Total,Accuracy\n${attempts?.map(a => `${a.completed_at},${a.test_title || 'Practice'},${a.domain},${a.score},${a.total_questions},${a.accuracy}`).join('\n')}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Performance_${faculty?.user?.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
    };

    if (loadingFaculty || loadingSummary || loadingAttempts) {
        return <div className="p-8 flex items-center justify-center h-[400px]"><Activity className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (!faculty) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 font-medium">Faculty member not found.</p>
                <Button onClick={() => navigate('/admin/faculty')}>Back to List</Button>
            </div>
        );
    }

    const filteredAttempts = attempts?.filter(a => domainFilter === 'All' || a.domain === domainFilter);
    const domains = ['All', ...new Set(attempts?.map(a => a.domain).filter(Boolean) as string[])];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Profile Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/faculty')} className="rounded-full hover:bg-white shadow-sm">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                            {faculty.user?.name.charAt(0) || 'F'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-black tracking-tight text-gray-900">{faculty.user?.name || 'Unknown'}</h1>
                                <Badge className="bg-blue-50 text-blue-600 border-blue-100 uppercase text-[10px] font-black">FACULTY</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500 font-medium">
                                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {faculty.user?.email}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {faculty.department} • {faculty.designation}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {faculty.experience_years} Years Experience</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none gap-2 rounded-xl font-bold text-gray-700 bg-white shadow-sm border-gray-200" onClick={handleExport}>
                        <Download className="h-4 w-4" /> Export Data
                    </Button>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPI backdrop="bg-emerald-50" icon={Award} iconColor="text-emerald-500" label="Overall Accuracy" value={`${Math.round(summary?.avg_accuracy || 0)}%`} sub="Across all domains" />
                <KPI backdrop="bg-blue-50" icon={Activity} iconColor="text-blue-500" label="Total Attempts" value={summary?.attempts_count || 0} sub="Practice & verified tests" />
                <KPI backdrop="bg-indigo-50" icon={Target} iconColor="text-indigo-500" label="Strongest Area" value={faculty.department} sub="Department focus" />
                <KPI backdrop="bg-red-50" icon={AlertCircle} iconColor="text-red-500" label="Verified Skills" value={summary?.verified_skills_count || 0} sub="Quality assured" />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Growth Plan & Skills */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Growth Plan Panel */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none text-primary">
                            <TrendingUp className="h-32 w-32" />
                        </div>
                        <CardHeader className="pb-2 border-b border-gray-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    <BrainCircuit className="h-5 w-5 text-primary" /> Active Growth Plan
                                </CardTitle>
                                {summary && summary.active_plan_progress > 0 && <Badge className="bg-primary/10 text-primary border-none uppercase text-[10px] font-black">In Progress</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {summary && summary.active_plan_progress > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-gray-900">Active Growth Path</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{faculty.department} Specialty</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-3xl font-black text-primary">{Math.round(summary.active_plan_progress)}%</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">Total Progress</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner p-1">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary via-blue-400 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                                            style={{ width: `${summary.active_plan_progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="p-4 bg-blue-50 rounded-full"><TrendingUp className="h-8 w-8 text-blue-300" /></div>
                                    <p className="text-gray-500 font-bold italic">No active growth plan currently tracking.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attempt History Table */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" /> Assessment History
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-50 text-emerald-600 border-none uppercase text-[9px] font-black">{attempts?.length || 0} Records</Badge>
                                <select
                                    className="text-[10px] font-black uppercase tracking-wider border-none bg-gray-50 rounded-lg px-2 py-1 outline-none"
                                    value={domainFilter}
                                    onChange={(e) => setDomainFilter(e.target.value)}
                                >
                                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/30">
                                    <TableRow>
                                        <TableHead className="pl-6 py-4 text-[10px] font-black uppercase text-gray-500">Date</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase text-gray-500">Assessment Title</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase text-gray-500">Domain</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase text-gray-500 text-center">Score</TableHead>
                                        <TableHead className="py-4 text-[10px] font-black uppercase text-gray-500 text-center">Accuracy</TableHead>
                                        <TableHead className="pr-6 py-4 text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAttempts?.map((attempt, i) => (
                                        <TableRow key={i} className="hover:bg-gray-50/50 transition-colors cursor-default">
                                            <TableCell className="pl-6 text-sm font-medium text-gray-500">{format(parseISO(attempt.completed_at), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="text-sm font-bold text-gray-900">{attempt.test_title || 'Expert-Led Assessment'}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-gray-200">{attempt.domain || faculty.department}</Badge></TableCell>
                                            <TableCell className="text-center text-sm font-bold">{attempt.score}/{attempt.total_questions}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`text-sm font-black ${Math.round(attempt.accuracy) >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {Math.round(attempt.accuracy)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-primary transition-colors">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredAttempts?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-gray-400 italic">No assessment history matching criteria.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Verified Skills & AI Insights */}
                <div className="space-y-8">
                    {/* Insights Card */}
                    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-blue-300" /> AI-Driven Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-300 tracking-widest">
                                    <AlertCircle className="h-3 w-3" /> Growth Recommendation
                                </div>
                                <p className="text-sm leading-relaxed text-blue-100 font-medium italic">
                                    "{faculty.user?.name} shows high engagement in {faculty.department}. Accuracy is stabilizing at {Math.round(summary?.avg_accuracy || 0)}%. Focus on achieving verification for all {faculty.skills?.length || 0} core skills."
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                                    <span className="text-lg font-black">{summary?.verified_skills_count || 0}</span>
                                    <span className="text-[10px] font-bold uppercase text-blue-200">Verified Skills</span>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
                                    <span className="text-lg font-black">{(faculty.skills?.length || 0) - (summary?.verified_skills_count || 0)}</span>
                                    <span className="text-[10px] font-bold uppercase text-blue-200">Total Gaps</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Skill Breakdown */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="p-6 border-b border-gray-50">
                            <CardTitle className="text-lg font-black">Skill & Proficiency Matrix</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {faculty.skills?.map((skill, i) => (
                                <div key={i} className="group p-4 bg-gray-50/50 rounded-2xl border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                                                {skill.skill.name}
                                                {skill.status === 'VERIFIED' && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{skill.skill.domain}</span>
                                        </div>
                                        <Badge className={`uppercase text-[9px] font-black ${skill.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'} border-none`}>
                                            {skill.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1.5 flex-1 rounded-full ${level <= skill.level ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Proficiency Level</span>
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">{skill.level} / 5</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KPI({ backdrop, icon: Icon, iconColor, label, value, sub }: any) {
    return (
        <Card className="border-none shadow-lg bg-white group overflow-hidden relative">
            <div className={`absolute top-0 right-0 h-24 w-24 ${backdrop} rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500 ease-out opacity-40`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${iconColor} relative z-10 group-hover:rotate-12 transition-transform`} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-gray-900">{value || 'N/A'}</div>
                <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-tighter flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-gray-300" /> {sub}
                </p>
            </CardContent>
        </Card>
    );
}
