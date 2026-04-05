import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programsApi, ProgramStatus } from '../../lib/api/programs';
import { enrollmentsApi } from '../../lib/api/enrollments';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, Users, Clock, ArrowLeft, CheckCircle2, List, Trophy, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingState } from '../../components/ui/LoadingState';

export default function ProgramDetails() {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const { data: program, isLoading: isLoadingProgram } = useQuery({
        queryKey: ['program', programId],
        queryFn: () => programsApi.getProgram(programId!),
        enabled: !!programId,
    });

    const { data: enrollments } = useQuery({
        queryKey: ['enrollments', user?.id],
        queryFn: enrollmentsApi.getMyEnrollments,
        enabled: !!user,
    });

    const enrollMutation = useMutation({
        mutationFn: () => enrollmentsApi.enroll({ program_id: programId! }),
        onSuccess: () => {
            addToast('Enrolled successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        },
        onError: (error: any) => {
            const detail = error?.response?.data?.detail;
            addToast(typeof detail === 'string' ? detail : (error.message || 'Failed to enroll'), 'error');
        }
    });

    const isEnrolled = enrollments?.some(e => e.program_id === programId);
    const enrolledCount = program?.enrollments?.length || 0;
    const seatsLeft = program ? Math.max(program.seats - enrolledCount, 0) : 0;

    const statusTone =
        program?.status === ProgramStatus.ONGOING
            ? 'bg-emerald-500 text-white'
            : program?.status === ProgramStatus.UPCOMING
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-white';

    if (isLoadingProgram) {
        return <LoadingState label="Loading program details" />;
    }

    if (!program) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-gray-800">Program Not Found</h2>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/faculty/programs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Programs
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-16">
            <Button
                variant="ghost"
                onClick={() => navigate('/faculty/programs')}
                className="group -ml-3 rounded-full px-4 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Programs
            </Button>

            <div className="space-y-8">
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.22),_transparent_32%),linear-gradient(135deg,_#fff_0%,_#f8fbff_46%,_#eef6ff_100%)] px-6 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10">
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-200/20 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-emerald-200/20 blur-3xl" />

                    <div className="relative space-y-8">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${statusTone}`}>
                                        {program.status}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600 backdrop-blur">
                                        {program.mode}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                                        {program.domain}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                        {program.title}
                                    </h1>
                                    <p className="max-w-3xl text-lg leading-8 text-slate-600">
                                        {program.description}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Enrollment Pulse</p>
                                        <p className="mt-1 text-xl font-black text-slate-900">{enrolledCount} / {program.seats}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Seats Remaining</p>
                                        <p className="mt-1 text-xl font-black text-slate-900">{seatsLeft}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Delivery</p>
                                        <p className="mt-1 text-xl font-black capitalize text-slate-900">{program.mode}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Your Status</p>
                                        <p className="mt-2 text-2xl font-black text-slate-900">
                                            {isEnrolled ? 'You are in' : 'Open for enrollment'}
                                        </p>
                                    </div>
                                    {isEnrolled ? (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                                            <CheckCircle2 className="h-4 w-4" /> Enrolled
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                                            <Sparkles className="h-4 w-4" /> Ready
                                        </span>
                                    )}
                                </div>

                                <div className="mt-5 rounded-2xl bg-slate-950 px-4 py-4 text-white">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Why This Program</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-200">
                                        Structured faculty upskilling with focused topics, measurable outcomes, and a delivery format built for working academics.
                                    </p>
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-semibold text-slate-500">Demand level</span>
                                        <span className="text-sm font-black text-slate-900">
                                            {seatsLeft === 0 ? 'Full' : seatsLeft <= 5 ? 'High' : 'Open'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-semibold text-slate-500">Best for</span>
                                        <span className="text-sm font-black text-slate-900">Active faculty learners</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Timeline</p>
                                        <p className="mt-1 text-xl font-black text-slate-900">
                                            {program.start_date ? format(new Date(program.start_date), 'MMM d') : 'TBD'} - {program.end_date ? format(new Date(program.end_date), 'MMM d, yyyy') : 'TBD'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Commitment</p>
                                        <p className="mt-1 text-xl font-black text-slate-900">{program.duration}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Capacity</p>
                                        <p className="mt-1 text-xl font-black text-slate-900">{enrolledCount} / {program.seats} enrolled</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                        <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_#f8fbff,_#eef5ff)]">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                                <div className="rounded-2xl bg-blue-600 p-2 text-white">
                                    <List className="h-5 w-5" />
                                </div>
                                Topics Covered
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                The subject areas faculty will actively work through in this program.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ul className="space-y-3.5">
                                {program.topics && program.topics.length > 0 ? (
                                    program.topics.map((topic, index) => (
                                        <li key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-black text-blue-700">
                                                {index + 1}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">{topic}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="rounded-2xl bg-slate-50 px-4 py-4 text-sm italic text-slate-500">
                                        No detailed topics listed available.
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                        <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_#fff9ef,_#fff5db)]">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
                                <div className="rounded-2xl bg-amber-500 p-2 text-white">
                                    <Trophy className="h-5 w-5" />
                                </div>
                                Key Benefits
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Outcomes and advantages you can expect once you participate.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ul className="space-y-3.5">
                                {program.benefits && program.benefits.length > 0 ? (
                                    program.benefits.map((benefit, index) => (
                                        <li key={index} className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 px-4 py-3">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                            <span className="text-sm font-semibold text-slate-700">{benefit}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="rounded-2xl bg-slate-50 px-4 py-4 text-sm italic text-slate-500">
                                        No specific benefits listed.
                                    </li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
                    <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="border-b border-slate-100 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-slate-900 p-3 text-white">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Enrollment Decision</p>
                                    <h3 className="mt-1 text-3xl font-black text-slate-950">Ready to upskill?</h3>
                                </div>
                            </div>

                            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                                Join this program to strengthen your academic practice, build technical confidence, and gain structured exposure to the topics most relevant to your development.
                            </p>

                            {seatsLeft < 5 && seatsLeft > 0 && (
                                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                                    <Sparkles className="h-4 w-4" /> Hurry, only {seatsLeft} seats left
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50/70 p-6 sm:p-8">
                            <div className="space-y-4">
                                <div className="rounded-2xl bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500">Enrollment state</p>
                                            <p className="text-lg font-black text-slate-900">
                                                {isEnrolled ? 'Already enrolled' : seatsLeft > 0 ? 'Seats available' : 'Program full'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {isEnrolled ? (
                                    <Button size="lg" variant="secondary" disabled className="h-14 w-full rounded-2xl text-base font-bold">
                                        Already Enrolled
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-slate-800"
                                        onClick={() => enrollMutation.mutate()}
                                        disabled={enrollMutation.isPending || enrolledCount >= program.seats}
                                    >
                                        {enrollMutation.isPending ? 'Processing...' : enrolledCount >= program.seats ? 'Program Full' : 'Confirm Enrollment'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
