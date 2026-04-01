import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { facultyApi, resolveBackendAssetUrl } from '../../lib/api/faculty';
import http from '../../lib/api/http';
import { SkillDomain } from '../../lib/api/skills';
import { testsApi } from '../../lib/api/tests';
import { attemptsApi } from '../../lib/api/attempts';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { EnrollmentStatus } from '../../lib/api/programs';
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
    Plus,
    Trash2,
    CheckCircle2,
    RefreshCw,
    Sparkles,
    Loader2,
    Award,
    MessageSquarePlus,
    MapPin,
    Globe,
    ShieldCheck
} from 'lucide-react';
import { FacultySkill } from '../../lib/types';
import { format } from 'date-fns';

export default function FacultyProfile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({
        department: '',
        designation: '',
        experience_years: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: profile } = useQuery({
        queryKey: ['faculty-profile', 'me'],
        queryFn: () => facultyApi.getMe(),
        enabled: !!user,
    });

    const skills = profile?.skills || [];
    const { register, handleSubmit, reset } = useForm<Omit<FacultySkill, 'id'>>();

    const addSkillMutation = useMutation({
        mutationFn: (data: { skill_name: string }) =>
            facultyApi.addSkill({
                skill_name: data.skill_name,
                domain: SkillDomain.TECHNOLOGY,
                level: 3,
            }),
        onSuccess: () => {
            addToast('New skill unlocked!', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            setIsSkillModalOpen(false);
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

    const updateProfileMutation = useMutation({
        mutationFn: (payload: { department?: string; designation?: string; experience_years?: number }) =>
            facultyApi.updateMe(payload),
        onSuccess: () => {
            addToast('Profile updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
            setIsProfileModalOpen(false);
        },
        onError: (error: any) => {
            const detail = error?.response?.data?.detail;
            addToast(typeof detail === 'string' ? detail : 'Failed to update profile', 'error');
        },
    });

    const uploadProfileImageMutation = useMutation({
        mutationFn: (file: File) => facultyApi.uploadProfileImage(file),
        onSuccess: () => {
            addToast('Profile picture updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
        },
        onError: (error: any) => {
            const detail = error?.response?.data?.detail;
            addToast(typeof detail === 'string' ? detail : 'Failed to upload image', 'error');
        },
    });

    const onSubmit = (data: any) => {
        addSkillMutation.mutate({
            skill_name: data.name,
        });
    };

    const handleOpenAdd = () => {
        reset();
        setIsSkillModalOpen(true);
    };

    const handleOpenProfileEdit = () => {
        setProfileForm({
            department: profile?.department || '',
            designation: profile?.designation || user?.designation || '',
            experience_years: profile?.experience_years != null ? String(profile.experience_years) : '',
        });
        setIsProfileModalOpen(true);
    };

    const triggerProfileImageUpload = () => {
        fileInputRef.current?.click();
    };

    const handleProfileImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = '';
        if (!selectedFile) {
            return;
        }
        uploadProfileImageMutation.mutate(selectedFile);
    };

    const handlePublicView = async () => {
        const publicPath = `${window.location.origin}/faculty/profile`;
        try {
            await navigator.clipboard.writeText(publicPath);
            addToast('Profile link copied to clipboard', 'success');
        } catch {
            addToast('Open this link to view profile: /faculty/profile', 'info');
        }
    };

    const saveProfile = () => {
        const payload: { department?: string; designation?: string; experience_years?: number } = {
            department: profileForm.department.trim() || undefined,
            designation: profileForm.designation.trim() || undefined,
        };
        if (profileForm.experience_years.trim() !== '') {
            const parsed = Number(profileForm.experience_years);
            if (Number.isFinite(parsed) && parsed >= 0) {
                payload.experience_years = parsed;
            }
        }
        updateProfileMutation.mutate(payload);
    };

    const testsQuery = useQuery({
        queryKey: ['tests-profile'],
        queryFn: () => testsApi.listTests(),
        enabled: !!user,
    });
    const attemptsQuery = useQuery({
        queryKey: ['attempts-profile', user?.id],
        queryFn: attemptsApi.getMyAttempts,
        enabled: !!user,
    });
    const programEnrollmentsQuery = useQuery({
        queryKey: ['program-enrollments-profile', user?.id],
        queryFn: enrollmentsApi.getMyEnrollments,
        enabled: !!user,
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

    const completedOfficialTests = useMemo(() => {
        const testsById = new Map((testsQuery.data || []).map(t => [t.id, t]));
        const submittedAttempts = (attemptsQuery.data || []).filter(a => a.test_id && a.submitted_at);
        const latestPassedByTest = new Map<string, (typeof submittedAttempts)[number]>();

        submittedAttempts.forEach((attempt) => {
            if (!attempt.test_id) return;
            const passMarks = testsById.get(attempt.test_id)?.pass_marks ?? 70;
            if ((attempt.accuracy || 0) < passMarks) return;

            const existing = latestPassedByTest.get(attempt.test_id);
            if (!existing) {
                latestPassedByTest.set(attempt.test_id, attempt);
                return;
            }

            const currentTime = new Date(attempt.submitted_at || attempt.started_at).getTime();
            const existingTime = new Date(existing.submitted_at || existing.started_at).getTime();
            if (currentTime > existingTime) {
                latestPassedByTest.set(attempt.test_id, attempt);
            }
        });

        return Array.from(latestPassedByTest.values()).sort(
            (a, b) =>
                new Date(b.submitted_at || b.started_at).getTime() -
                new Date(a.submitted_at || a.started_at).getTime()
        );
    }, [attemptsQuery.data, testsQuery.data]);

    const profileInsights = useMemo(() => {
        const attempts = (attemptsQuery.data || []).filter((a) => !!a.submitted_at);
        const avgAccuracy = attempts.length
            ? Math.round(attempts.reduce((acc, a) => acc + (a.accuracy || 0), 0) / attempts.length)
            : 0;

        const recent = [...attempts]
            .sort((a, b) => new Date(b.submitted_at || b.started_at).getTime() - new Date(a.submitted_at || a.started_at).getTime())
            .slice(0, 3);
        const recentAvg = recent.length
            ? Math.round(recent.reduce((acc, a) => acc + (a.accuracy || 0), 0) / recent.length)
            : 0;

        const domainStats = new Map<string, { total: number; count: number }>();
        attempts.forEach((a) => {
            const domain = (a.domain || 'General').trim();
            const existing = domainStats.get(domain) || { total: 0, count: 0 };
            existing.total += a.accuracy || 0;
            existing.count += 1;
            domainStats.set(domain, existing);
        });
        const weakestDomain = Array.from(domainStats.entries())
            .map(([domain, stat]) => ({ domain, avg: stat.total / stat.count }))
            .sort((a, b) => a.avg - b.avg)[0]?.domain;

        const currentSkills = (skills || []).map((s) => s.skill.name);
        const existingSkillSet = new Set(currentSkills.map((s) => s.toLowerCase()));

        const skillBankByDomain: Record<string, string[]> = {
            ai: ['Prompt Engineering', 'Applied Machine Learning', 'Model Evaluation', 'AI Ethics'],
            python: ['Python Advanced', 'API Design', 'Data Structures', 'Async Programming'],
            cloud: ['Cloud Architecture', 'DevOps Basics', 'CI/CD', 'System Design'],
            communication: ['Technical Communication', 'Presentation Skills', 'Mentoring', 'Stakeholder Management'],
            teaching: ['Outcome-based Assessment', 'Instructional Design', 'Rubric Design', 'Classroom Analytics'],
            general: ['Problem Solving', 'Project Planning', 'Data Interpretation', 'Documentation'],
        };

        const weakKey = (weakestDomain || '').toLowerCase();
        let bank = skillBankByDomain.general;
        if (weakKey.includes('ai')) bank = skillBankByDomain.ai;
        else if (weakKey.includes('python')) bank = skillBankByDomain.python;
        else if (weakKey.includes('cloud')) bank = skillBankByDomain.cloud;
        else if (weakKey.includes('comm')) bank = skillBankByDomain.communication;
        else if (weakKey.includes('teach') || weakKey.includes('pedagog')) bank = skillBankByDomain.teaching;

        const completedCourseTrainings = (profile?.course_enrollments || []).filter((e) => !!e.completed_at).length;
        const activeCourseTrainings = (profile?.course_enrollments || []).filter((e) => !e.completed_at).length;
        const completedProgramTrainings = (programEnrollmentsQuery.data || []).filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
        const activeProgramTrainings = (programEnrollmentsQuery.data || []).filter((e) => e.status === EnrollmentStatus.ENROLLED).length;

        const totalCompletedTrainings = completedCourseTrainings + completedProgramTrainings;
        const totalActiveTrainings = activeCourseTrainings + activeProgramTrainings;
        const hasAnyProfileData = attempts.length > 0 || currentSkills.length > 0 || totalCompletedTrainings > 0 || totalActiveTrainings > 0;

        let suggestions: string[] = [];
        if (hasAnyProfileData) {
            suggestions = bank.filter((s) => !existingSkillSet.has(s.toLowerCase())).slice(0, 4);
            if (suggestions.length < 4) {
                const fallback = [...skillBankByDomain.general, ...skillBankByDomain.teaching, ...skillBankByDomain.communication]
                    .filter((s) => !existingSkillSet.has(s.toLowerCase()) && !suggestions.includes(s));
                suggestions = [...suggestions, ...fallback].slice(0, 4);
            }
        }

        const insight = attempts.length === 0
            ? `No activity data yet. Add skills, enroll in training, or complete a test to generate personalized insights.`
            : `Average score: ${avgAccuracy}% across ${attempts.length} completed test${attempts.length > 1 ? 's' : ''}. Recent trend: ${recentAvg}%. ` +
            `Training completed: ${totalCompletedTrainings}, active: ${totalActiveTrainings}. ` +
            (weakestDomain ? `Biggest improvement area: ${weakestDomain}.` : `Keep building consistency across topics.`);

        return {
            suggestions,
            insight,
        };
    }, [attemptsQuery.data, programEnrollmentsQuery.data, profile?.course_enrollments, skills]);

    const profileImageUrl = resolveBackendAssetUrl(profile?.profile_image_url);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── PROFILE HEADER ────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-200/50 group sm:rounded-[40px]">
                {/* Background Cover Gradient */}
                <div className="h-64 bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
                    {/* Abstract Shapes */}
                    <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
                </div>

                {/* Profile Info Overlay */}
                <div className="relative z-10 -mt-20 flex flex-col items-center gap-8 px-4 pb-8 sm:px-8 sm:pb-10 md:flex-row md:items-end lg:px-10">
                    <div className="relative group/avatar">
                        <button
                            type="button"
                            onClick={triggerProfileImageUpload}
                            className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-[28px] border-[6px] border-white bg-slate-100 text-4xl font-bold text-blue-600 shadow-xl shadow-blue-900/10 sm:h-40 sm:w-40 sm:rounded-[36px] sm:border-[8px] sm:text-5xl md:h-44 md:w-44 md:rounded-[40px]"
                            disabled={uploadProfileImageMutation.isPending}
                        >
                            {profileImageUrl ? (
                                <img src={profileImageUrl} alt={`${user.name} profile`} className="h-full w-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                {uploadProfileImageMutation.isPending ? (
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                ) : (
                                    <Plus className="h-8 w-8 text-white" />
                                )}
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleProfileImageSelected}
                        />
                        <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-2xl bg-emerald-500 border-4 border-white flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="flex-1 pb-2 text-center md:pb-4 md:text-left">
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{user.name}</h1>
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-7 rounded-lg">VERIFIED FACULTY</Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500 font-semibold md:justify-start md:gap-6">
                            <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> {profile?.designation || user.designation}</span>
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" /> {profile?.department || 'Faculty Division'}</span>
                            <span className="flex items-center gap-2 font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                <Award className="h-4 w-4" /> {profile?.experience_years || 0} Years Exp
                            </span>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 pb-2 sm:flex-row sm:flex-wrap md:w-auto md:pb-4">
                        <Button
                            onClick={triggerProfileImageUpload}
                            className="h-12 w-full rounded-2xl bg-slate-900 px-5 font-bold text-white transition-all hover:bg-slate-800 sm:h-14 sm:w-auto sm:px-8"
                            disabled={uploadProfileImageMutation.isPending}
                        >
                            {uploadProfileImageMutation.isPending ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    UPLOADING...
                                </span>
                            ) : (
                                'UPLOAD PHOTO'
                            )}
                        </Button>
                        <Button
                            onClick={handleOpenProfileEdit}
                            className="h-12 w-full rounded-2xl border-2 border-slate-100 bg-white px-5 font-bold text-slate-900 shadow-xl shadow-slate-200/50 transition-all hover:bg-slate-50 sm:h-14 sm:w-auto sm:px-8"
                        >
                            EDIT PROFILE
                        </Button>
                        <Button
                            onClick={handlePublicView}
                            className="h-12 w-full rounded-2xl bg-blue-600 px-5 font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-700 sm:h-14 sm:w-auto sm:px-8"
                        >
                            PUBLIC VIEW
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-10 md:grid-cols-3">
                {/* ── SIDEBAR STATS ─────────────────────────────────────── */}
                <div className="space-y-10">
                    <Card className="rounded-[28px] border-none bg-white p-5 shadow-2xl shadow-slate-200/50 sm:rounded-[40px] sm:p-8">
                        <CardHeader className="p-0 mb-6">
                            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                AI Recommendations
                            </CardTitle>
                        </CardHeader>
                        <div className="space-y-5">
                            <div className="flex flex-wrap gap-2">
                                {profileInsights.suggestions.map((skill, i) => (
                                    <Badge key={`${skill}-${i}`} variant="secondary" className="bg-white/80 hover:bg-white border-white/40 text-indigo-700 px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-sm font-semibold">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 relative overflow-hidden">
                                <p className="text-xs text-indigo-50 leading-relaxed font-semibold">
                                    {profileInsights.insight}
                                </p>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-10 gap-2 rounded-xl"
                                onClick={() => {
                                    attemptsQuery.refetch();
                                    programEnrollmentsQuery.refetch();
                                    queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
                                }}
                                disabled={attemptsQuery.isFetching || programEnrollmentsQuery.isFetching}
                            >
                                <RefreshCw className={(attemptsQuery.isFetching || programEnrollmentsQuery.isFetching) ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                                UPDATE INSIGHTS
                            </Button>
                        </div>
                    </Card>
                </div>
                {/* MAIN CONTENT: SKILLS & COURSES */}
                <div className="md:col-span-2 space-y-10">
                    {/* Skills Matrix */}
                    <Card className="rounded-[28px] border-none bg-white shadow-2xl shadow-slate-200/50 sm:rounded-[40px]">
                        <CardHeader className="flex flex-row items-center justify-between p-5 pb-0 sm:p-10 sm:pb-0">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Expertise Matrix</CardTitle>
                                <CardDescription className="text-slate-400 font-semibold mt-1 uppercase tracking-widest text-[10px]">Your Skills</CardDescription>
                            </div>
                            <Button onClick={handleOpenAdd} size="icon" className="h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 text-white">
                                <Plus className="h-7 w-7" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-5 pt-6 sm:p-10 sm:pt-6">
                            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50/50 shadow-sm">
                                <Table>
                                    <TableHeader className="bg-white">
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="font-bold text-slate-900 py-6 pl-8">SKILL</TableHead>
                                            <TableHead className="text-right py-6 pr-8"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {skills?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center py-20">
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
                                                <TableCell className="text-right py-6 pr-8">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                    {/* Official Test Completions */}
                    <Card className="overflow-hidden rounded-[28px] border-none bg-white shadow-2xl shadow-slate-200/50 sm:rounded-[40px]">
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <CardHeader className="p-5 pb-0 sm:p-10 sm:pb-0">
                            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <CheckCircle2 className="h-7 w-7 text-blue-600" /> Official Test Completions
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-semibold mt-1 uppercase tracking-widest text-[10px]">
                                {completedOfficialTests.length} Tests Cleared
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-10">
                            {completedOfficialTests.length === 0 ? (
                                <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 font-semibold uppercase tracking-widest text-[11px]">No official tests passed yet</p>
                                    <p className="text-slate-300 text-xs mt-2">Pass an official test to see completion status here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {completedOfficialTests.map(attempt => {
                                        const test = testsQuery.data?.find(t => t.id === attempt.test_id);
                                        return (
                                            <div key={attempt.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{test?.title || attempt.test_title || 'Official Test'}</p>
                                                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                                                        Passed {format(new Date(attempt.submitted_at || attempt.started_at), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 sm:shrink-0">
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold h-7">
                                                        {Math.round(attempt.accuracy || 0)}%
                                                    </Badge>
                                                    {attempt.test_id && (
                                                        <button
                                                            onClick={() => navigate(`/faculty/tests/${attempt.test_id}/result/${attempt.id}`)}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                                        >
                                                            VIEW RESULT
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Raise Feedback */}
                    <Card className="relative overflow-hidden rounded-[28px] border-none bg-gradient-to-br from-indigo-700 to-indigo-900 p-5 text-white shadow-2xl shadow-indigo-200/30 sm:rounded-[40px] sm:p-10">
                        <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm pointer-events-none">
                            <MessageSquarePlus className="h-40 w-40 text-white sm:h-64 sm:w-64" />
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
            <Modal isOpen={isSkillModalOpen} onClose={() => setIsSkillModalOpen(false)} title="Add Skill">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 px-2">
                    <Input
                        label="Skill Name"
                        {...register('name', { required: true })}
                        placeholder="e.g. Python Programming"
                        className="rounded-2xl h-12"
                    />

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsSkillModalOpen(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
                        <Button type="submit" className="flex-1 h-12 rounded-2xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20">Add Skill</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Edit Profile">
                <div className="space-y-4 pt-2">
                    <Input
                        label="Department"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value }))}
                        placeholder="e.g. Computer Science"
                    />
                    <Input
                        label="Designation"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))}
                        placeholder="e.g. Assistant Professor"
                    />
                    <Input
                        label="Experience (Years)"
                        type="number"
                        min={0}
                        value={profileForm.experience_years}
                        onChange={(e) => setProfileForm((p) => ({ ...p, experience_years: e.target.value }))}
                        placeholder="e.g. 8"
                    />
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsProfileModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={saveProfile} disabled={updateProfileMutation.isPending}>
                            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}



