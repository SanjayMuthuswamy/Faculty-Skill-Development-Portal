import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { facultyApi, SkillStatus } from '../../lib/api/faculty';
import http from '../../lib/api/http';
import { SkillDomain } from '../../lib/api/skills';
import { coursesApi } from '../../lib/api/courses';
import { queriesApi } from '../../lib/api/forum';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import {
    Mail,
    Briefcase,
    Calendar,
    Plus,
    Trash2,
    Edit2,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    RefreshCw,
    Loader2,
    Award,
    Download,
    MessageSquarePlus,
    MapPin,
    Globe,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import { FacultySkill } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

function SkillSuggestions() {
    const { data: suggestions, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['skill-suggestions'],
        queryFn: () => facultyApi.getSkillSuggestions(),
        staleTime: 1000 * 60 * 30, // 30 mins
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 animate-pulse" />
                </div>
                <p className="text-sm text-slate-500 font-semibold tracking-tight">AI is analyzing your expertise...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
                {suggestions?.suggested_skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/80 hover:bg-white border-white/40 text-indigo-700 px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-sm font-semibold">
                        {skill}
                    </Badge>
                ))}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-12 w-12 text-white" />
                </div>
                <p className="text-xs text-indigo-50 leading-relaxed font-semibold relative z-10">
                    "{suggestions?.reasoning}"
                </p>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-10 gap-2 rounded-xl group"
                onClick={() => refetch()}
                disabled={isFetching}
            >
                <RefreshCw className={cn("h-4 w-4 transition-all duration-500", isFetching ? "animate-spin" : "group-hover:rotate-180")} />
                UPDATE INSIGHTS
            </Button>
        </div>
    );
}

export default function FacultyProfile() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<any | null>(null);

    const { data: profile } = useQuery({
        queryKey: ['faculty-profile', 'me'],
        queryFn: () => facultyApi.getMe(),
        enabled: !!user,
    });

    const skills = profile?.skills || [];
    const { register, handleSubmit, reset, setValue } = useForm<Omit<FacultySkill, 'id'>>();

    const addSkillMutation = useMutation({
        mutationFn: (data: { skill_name: string, domain: string, level: number }) => facultyApi.addSkill(data),
        onSuccess: () => {
            addToast('New skill unlocked!', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            setIsSkillModalOpen(false);
            reset();
        },
    });

    const updateSkillMutation = useMutation({
        mutationFn: (data: { id: string; updates: { level: number } }) =>
            http.patch(`/api/v1/faculty/me/skills/${data.id}`, data.updates).then(r => r.data),
        onSuccess: () => {
            addToast('Level updated!', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            setIsSkillModalOpen(false);
            setEditingSkill(null);
            reset();
        },
    });

    const deleteSkillMutation = useMutation({
        mutationFn: (id: string) =>
            http.delete(`/api/v1/faculty/me/skills/${id}`).then(r => r.data),
        onSuccess: () => {
            addToast('Skill archived', 'info');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
        },
    });

    const onSubmit = (data: any) => {
        if (editingSkill) {
            updateSkillMutation.mutate({ id: editingSkill.id, updates: { level: parseInt(data.level) } });
        } else {
            addSkillMutation.mutate({
                skill_name: data.name,
                domain: data.category === 'technical' ? SkillDomain.TECHNOLOGY : SkillDomain.TEACHING,
                level: parseInt(data.level)
            });
        }
    };

    const handleEdit = (skill: any) => {
        setEditingSkill(skill);
        setValue('name' as any, skill.skill?.name ?? skill.name ?? '');
        setValue('level' as any, String(skill.level));
        setIsSkillModalOpen(true);
    };

    const handleOpenAdd = () => {
        setEditingSkill(null);
        reset();
        setIsSkillModalOpen(true);
    };

    const completedQuery = useQuery({
        queryKey: ['my-course-enrollments-profile'],
        queryFn: coursesApi.getMyEnrollments,
    });
    const allCoursesQuery = useQuery({
        queryKey: ['all-courses-profile'],
        queryFn: coursesApi.listCourses,
    });

    const [queryForm, setQueryForm] = useState({ category: 'Technical Issue', description: '' });
    const [querySuccess, setQuerySuccess] = useState(false);
    const queryMutation = useMutation({
        mutationFn: queriesApi.submitQuery,
        onSuccess: () => {
            setQuerySuccess(true);
            setQueryForm({ category: 'Technical Issue', description: '' });
            addToast('Query sent to admin portal', 'success');
        },
    });

    const completedEnrollments = (completedQuery.data || []).filter(e => e.completed_at || e.certificate_issued);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── PROFILE HEADER ────────────────────────────────────────── */}
            <div className="relative rounded-[40px] overflow-hidden bg-white shadow-2xl shadow-slate-200/50 group">
                {/* Background Cover Gradient */}
                <div className="h-64 bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
                    {/* Abstract Shapes */}
                    <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
                </div>

                {/* Profile Info Overlay */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-20 relative z-10">
                    <div className="relative group/avatar">
                        <div className="h-44 w-44 rounded-[40px] border-[8px] border-white bg-slate-100 flex items-center justify-center text-5xl font-bold text-blue-600 shadow-xl overflow-hidden shadow-blue-900/10">
                            {user.name.charAt(0)}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                <Plus className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl bg-emerald-500 border-4 border-white flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{user.name}</h1>
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-7 rounded-lg">VERIFIED FACULTY</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 text-slate-500 font-semibold">
                            <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> {user.designation}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" /> {profile?.department || 'Faculty Division'}</span>
                            <span className="flex items-center gap-2 font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                <Award className="h-4 w-4" /> {profile?.experience_years || 0} Years Exp
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pb-4">
                        <Button className="rounded-2xl h-14 px-8 font-bold bg-white text-slate-900 border-2 border-slate-100 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all">
                            EDIT PROFILE
                        </Button>
                        <Button className="rounded-2xl h-14 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 transition-all">
                            PUBLIC VIEW
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
                {/* ── SIDEBAR STATS ─────────────────────────────────────── */}
                <div className="space-y-10">
                    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] bg-white p-8">
                        <CardHeader className="p-0 mb-6">
                            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                AI Recommendations
                            </CardTitle>
                        </CardHeader>
                        <SkillSuggestions />
                    </Card>


                </div>

                {/* ── MAIN CONTENT: SKILLS & COURSES ────────────────────── */}
                <div className="md:col-span-2 space-y-10">
                    {/* Skills Matrix */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] bg-white">
                        <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Expertise Matrix</CardTitle>
                                <CardDescription className="text-slate-400 font-semibold mt-1 uppercase tracking-widest text-[10px]">Technical & Pedagogical Standing</CardDescription>
                            </div>
                            <Button onClick={handleOpenAdd} size="icon" className="h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 text-white">
                                <Plus className="h-7 w-7" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-10 pt-6">
                            <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-slate-50/50">
                                <Table>
                                    <TableHeader className="bg-white">
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="font-bold text-slate-900 py-6 pl-8">SKILL</TableHead>
                                            <TableHead className="font-semibold text-slate-400 uppercase tracking-widest text-[10px] py-6">CATEGORY</TableHead>
                                            <TableHead className="font-semibold text-slate-400 uppercase tracking-widest text-[10px] py-6">LEVEL</TableHead>
                                            <TableHead className="font-semibold text-slate-400 uppercase tracking-widest text-[10px] py-6">STATUS</TableHead>
                                            <TableHead className="text-right py-6 pr-8"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {skills?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-20">
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                                            <Briefcase className="h-8 w-8 text-slate-300" />
                                                        </div>
                                                        <p className="font-bold text-slate-900">No skills identified yet</p>
                                                        <p className="text-slate-400 text-sm font-medium mt-1">Start by adding your first skill above</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : skills?.map((skill) => (
                                            <TableRow key={skill.id} className="hover:bg-white group transition-colors border-slate-50">
                                                <TableCell className="font-bold text-slate-900 py-6 pl-8">{skill.skill.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize bg-white border-slate-200 text-slate-600 font-semibold h-7 rounded-lg">{skill.skill.domain}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        {[1, 2, 3, 4, 5].map(lv => (
                                                            <div key={lv} className={cn(
                                                                "h-1.5 w-6 rounded-full transition-all duration-500",
                                                                lv <= skill.level
                                                                    ? skill.level >= 4 ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-blue-500 shadow-sm shadow-blue-500/20"
                                                                    : "bg-slate-200"
                                                            )} />
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "font-bold uppercase tracking-widest text-[9px] h-7 rounded-lg shadow-sm border-none",
                                                        skill.status === SkillStatus.VERIFIED ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                    )}>
                                                        {skill.status === SkillStatus.VERIFIED ? "Verified" : "Self-Declared"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right py-6 pr-8">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(skill)} className="h-9 w-9 rounded-xl hover:bg-slate-100">
                                                            <Edit2 className="h-4 w-4 text-slate-400" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteSkillMutation.mutate(skill.id)} className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Completed Certificates */}
                    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[40px] bg-white overflow-hidden">
                        <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-blue-500" />
                        <CardHeader className="p-10 pb-0">
                            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <Award className="h-7 w-7 text-emerald-500" /> Earned Certifications
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-semibold mt-1 uppercase tracking-widest text-[10px]">Validated Learning Path Achievements</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10">
                            {completedEnrollments.length === 0 ? (
                                <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 font-semibold uppercase tracking-widest text-[11px]">No certifications earned yet</p>
                                    <p className="text-slate-300 text-xs mt-2">Finish enrolled courses to unlock official certificates</p>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {completedEnrollments.map(enrollment => {
                                        const course = allCoursesQuery.data?.find(c => c.id === enrollment.course_id);
                                        return (
                                            <div key={enrollment.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-start gap-4 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                                                <div className="h-16 w-16 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Award className="h-8 w-8 text-emerald-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-900 truncate leading-tight mb-1">{course?.title || "Course Completed"}</h4>
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                                                        Earned {enrollment.completed_at ? format(new Date(enrollment.completed_at), 'MMM yyyy') : 'Recently'}
                                                    </p>
                                                    <a
                                                        href={`/faculty/courses/${enrollment.course_id}/certificate`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 group/link"
                                                    >
                                                        DOWNLOAD CERTIFICATE
                                                        <ExternalLink className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Raise Feedback */}
                    <Card className="border-none shadow-2xl shadow-indigo-200/30 rounded-[40px] bg-gradient-to-br from-indigo-700 to-indigo-900 text-white p-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm pointer-events-none">
                            <MessageSquarePlus className="h-64 w-64 text-white" />
                        </div>
                        <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                            <div>
                                <CardTitle className="text-3xl font-bold mb-4">Request Support</CardTitle>
                                <p className="text-indigo-100 font-medium leading-relaxed mb-6">
                                    Encountering technical challenges or have ideas for growth? Submit a query directly to the admin steering committee.
                                </p>
                                {querySuccess ? (
                                    <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-center animate-in zoom-in-95 duration-300">
                                        <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 border-4 border-white/20">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <p className="font-bold text-lg">Query Dispatched!</p>
                                        <p className="text-xs text-indigo-200 font-semibold mt-1 uppercase tracking-widest">Expected Response: 24-48 Hours</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-6 h-10 px-6 rounded-xl border-white/20 hover:bg-white/10 text-white font-bold"
                                            onClick={() => setQuerySuccess(false)}
                                        >
                                            NEW QUERY
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <select
                                            className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 px-6 text-sm font-semibold focus:outline-none focus:bg-white/20 transition-all appearance-none outline-none"
                                            value={queryForm.category}
                                            onChange={e => setQueryForm(p => ({ ...p, category: e.target.value }))}
                                        >
                                            <option className="bg-slate-900">Technical Issue</option>
                                            <option className="bg-slate-900">Course Feedback</option>
                                            <option className="bg-slate-900">Feature Request</option>
                                            <option className="bg-slate-900">Other</option>
                                        </select>
                                        <textarea
                                            className="w-full h-32 px-6 py-4 rounded-3xl bg-white/10 border border-white/20 text-sm font-medium placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all resize-none outline-none"
                                            placeholder="Clearly outline your query or feedback here..."
                                            value={queryForm.description}
                                            onChange={e => setQueryForm(p => ({ ...p, description: e.target.value }))}
                                        />
                                        <Button
                                            disabled={!queryForm.description.trim() || queryMutation.isPending}
                                            onClick={() => queryMutation.mutate(queryForm)}
                                            className="w-full h-14 rounded-2xl bg-white text-indigo-900 font-bold hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-xl shadow-indigo-900/50"
                                        >
                                            {queryMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "SUBMIT DISPATCH"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="hidden md:block">
                                <div className="space-y-4">
                                    {[
                                        { icon: Globe, label: "Official Support Channel", value: "support.faculty.portal" },
                                        { icon: Mail, label: "Admin Contact Email", value: "admin@university.edu" },
                                        { icon: RefreshCw, label: "Portal Version", value: "v2.0.4 Premium" }
                                    ].map((item, id) => (
                                        <div key={id} className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all">
                                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
                                                <item.icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest">{item.label}</p>
                                                <p className="font-bold text-white">{item.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={isSkillModalOpen} onClose={() => setIsSkillModalOpen(false)} title={editingSkill ? "Refine Expertise" : "Add Skill"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 px-2">
                    <Input
                        label="Skill Definition"
                        {...register('name', { required: true })}
                        placeholder="e.g. Advanced Machine Learning"
                        className="rounded-2xl h-12"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Domain</label>
                            <select className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20" {...register('category')}>
                                <option value="technical">Technical</option>
                                <option value="pedagogy">Pedagogy</option>
                                <option value="soft-skills">Soft Skills</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1">Skill Level</label>
                            <select className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20" {...register('level')}>
                                <option value="1">1 - Foundation</option>
                                <option value="2">2 - Practicing</option>
                                <option value="3">3 - Competent</option>
                                <option value="4">4 - Advanced</option>
                                <option value="5">5 - Master</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsSkillModalOpen(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
                        <Button type="submit" className="flex-1 h-12 rounded-2xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20">{editingSkill ? "Update Level" : "Integrate Skill"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
