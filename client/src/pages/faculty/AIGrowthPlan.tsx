import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { skillsApi } from '../../lib/api/skills';
import { roadmapsApi, type RoadmapResponse } from '../../lib/api/roadmaps';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Sparkles, RefreshCw, CheckCircle2, BookOpen, Activity, Target, ChevronRight, TrendingUp, Calendar, ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { getApiErrorMessage } from '../../lib/api/error';

const SKILL_LEVELS = [
    { value: 'beginner', label: 'Beginner', desc: 'Starting from fundamentals' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Building depth and consistency' },
    { value: 'advanced', label: 'Advanced', desc: 'Sharpening mastery and speed' },
] as const;

type WeeklyRoadmapItem = RoadmapResponse['weekly_plan'][0];

export default function AIGrowthPlan() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
    const [rmSkillMode, setRmSkillMode] = useState<'predefined' | 'custom'>('custom');
    const [rmSelectedSkill, setRmSelectedSkill] = useState('');
    const [rmCustomSkill, setRmCustomSkill] = useState('Professional Development');
    const [rmWeeks, setRmWeeks] = useState(4);
    const [rmHours, setRmHours] = useState(10);
    const [rmLevel, setRmLevel] = useState<string>('beginner');

    const { data: allSkills } = useQuery({ queryKey: ['all-skills'], queryFn: () => skillsApi.listSkills() });
    const { data: latestRoadmap, isLoading: isLoadingRoadmap } = useQuery({
        queryKey: ['roadmap-latest', user?.id],
        queryFn: () => roadmapsApi.getLatest(),
        enabled: !!user,
        retry: false,
    });

    const generateMutation = useMutation({
        mutationFn: (data: { skill: string; weeks: number; hours_per_week: number; current_level: string }) => roadmapsApi.generate(data),
        onSuccess: () => {
            setShowForm(false);
            setExpandedWeeks({});
            queryClient.invalidateQueries({ queryKey: ['roadmap-latest'] });
        },
        onError: (error) => {
            addToast(getApiErrorMessage(error, 'Failed to generate roadmap'), 'error');
        },
    });

    const progressMutation = useMutation({
        mutationFn: (data: { roadmapId: string; week: number; item_type: 'goal' | 'practice'; item_index: number; completed: boolean }) =>
            roadmapsApi.updateProgress(data.roadmapId, { week: data.week, item_type: data.item_type, item_index: data.item_index, completed: data.completed }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roadmap-latest'] }),
        onError: (error) => addToast(getApiErrorMessage(error, 'Failed to update roadmap progress'), 'error'),
    });

    const effectiveSkill = rmSkillMode === 'custom' ? rmCustomSkill.trim() : rmSelectedSkill;
    const isCustomValid = rmCustomSkill.trim().length >= 2 && rmCustomSkill.trim().length <= 60;
    const isFormValid = rmSkillMode === 'custom' ? isCustomValid : !!rmSelectedSkill;
    const plannedHours = rmWeeks * rmHours;

    const getWeekCompletion = (week: WeeklyRoadmapItem) => {
        if (!week.items?.length) return 0;
        return Math.round((week.items.filter(i => i.completed).length / week.items.length) * 100);
    };

    const roadmapStats = useMemo(() => {
        if (!latestRoadmap) return { total: 0, done: 0, pct: 0, next: null as number | null };
        const total = latestRoadmap.weekly_plan.reduce((s, w) => s + (w.items?.length || 0), 0);
        const done = latestRoadmap.weekly_plan.reduce((s, w) => s + (w.items?.filter(i => i.completed).length || 0), 0);
        const pct = total ? Math.round((done / total) * 100) : 0;
        const next = latestRoadmap.weekly_plan.find(w => getWeekCompletion(w) < 100)?.week ?? null;
        return { total, done, pct, next };
    }, [latestRoadmap]);

    const splitPracticeItems = (practice: string[]) => {
        const tests: Array<{ task: string; index: number }> = [];
        const required: Array<{ task: string; index: number }> = [];
        const regular: Array<{ task: string; index: number }> = [];
        (practice || []).forEach((task, index) => {
            const upper = task.trim().toUpperCase();
            if (upper.startsWith('TEST:')) return tests.push({ task, index });
            if (upper.startsWith('BUILD:') || upper.startsWith('REVIEW:') || upper.startsWith('REQUIRED:')) return required.push({ task, index });
            regular.push({ task, index });
        });
        return { tests, required, regular };
    };

    if (isLoadingRoadmap) return <div className="flex h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><RefreshCw className="h-6 w-6 animate-spin text-blue-600" /></div>;

    if (latestRoadmap && !showForm && !generateMutation.isPending) {
        return (
            <div className="space-y-6 pb-12">
                <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 md:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-600 text-white border-none font-bold"><Sparkles className="h-3 w-3 mr-1.5" />AI ROADMAP</Badge>
                                <Badge variant="outline" className="border-slate-300 text-slate-600 font-bold">{latestRoadmap.weeks} weeks</Badge>
                                <Badge variant="outline" className="border-slate-300 text-slate-600 font-bold">{latestRoadmap.hours_per_week} hrs/week</Badge>
                                <Badge variant="outline" className="border-blue-300 text-blue-700 font-bold capitalize">{latestRoadmap.current_level}</Badge>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900">Growth Plan for <span className="text-blue-700">{latestRoadmap.skill}</span></h1>
                            <p className="text-slate-600 flex items-center gap-2 font-medium"><Calendar className="h-4 w-4" />Created on {new Date(latestRoadmap.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => navigate('/faculty/practice')}>Open Practice</Button>
                            <Button className="rounded-xl bg-slate-900 hover:bg-slate-800" onClick={() => { setShowForm(true); setRmSelectedSkill(''); setRmCustomSkill('Professional Development'); setRmWeeks(4); setRmHours(10); setRmLevel('beginner'); generateMutation.reset(); }}><RefreshCw className="h-4 w-4 mr-2" />New Plan</Button>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall</p><p className="text-2xl font-black text-slate-900 mt-1">{roadmapStats.pct}%</p><div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${roadmapStats.pct}%` }} /></div></div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tasks Done</p><p className="text-2xl font-black text-slate-900 mt-1">{roadmapStats.done}/{roadmapStats.total}</p></div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Weeks</p><p className="text-2xl font-black text-slate-900 mt-1">{latestRoadmap.weeks}</p></div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Next Focus</p><p className="text-2xl font-black text-slate-900 mt-1">{roadmapStats.next ? `Week ${roadmapStats.next}` : 'Done'}</p></div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" />Weekly Milestones</h3><p className="text-xs font-semibold text-slate-500">Click a week to expand or collapse</p></div>
                    {latestRoadmap.weekly_plan.map((week) => {
                        const weekPct = getWeekCompletion(week);
                        const isExpanded = expandedWeeks[week.week] ?? (week.week <= 2 || weekPct < 100);
                        return (
                            <Card key={week.week} className="overflow-hidden border-slate-200 shadow-sm">
                                <button type="button" className="w-full p-5 md:p-6 text-left hover:bg-slate-50 transition-colors" onClick={() => setExpandedWeeks(prev => ({ ...prev, [week.week]: !prev[week.week] }))}>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-black', weekPct >= 100 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white')}>{week.week}</span>
                                            <div><h4 className="text-lg font-black text-slate-900">Week {week.week}</h4><p className="text-xs text-slate-500">{week.goals.length} goals, {week.topics.length} topics, {week.practice.length} practice items</p></div>
                                            {weekPct >= 100 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 h-6"><CheckCircle2 className="h-3 w-3 mr-1" />COMPLETE</Badge>}
                                        </div>
                                        <div className="flex items-center gap-3"><div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden"><div className={cn('h-full rounded-full', weekPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${weekPct}%` }} /></div><span className="text-xs font-bold text-slate-500">{weekPct}%</span><ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isExpanded && 'rotate-180')} /></div>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 md:p-6 grid gap-4 lg:grid-cols-4">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-blue-600" />Goals</h5><div className="space-y-2 mt-3">{week.goals.map((goal, idx) => { const item = week.items?.find(i => i.item_type === 'goal' && i.item_index === idx); return <button type="button" key={idx} className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50" onClick={() => item && progressMutation.mutate({ roadmapId: latestRoadmap.id, week: week.week, item_type: 'goal', item_index: idx, completed: !item.completed })}><div className={cn('h-4 w-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0', item?.completed ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>{item?.completed && <CheckCircle2 className="h-3 w-3 text-white" />}</div><span className={cn('text-xs font-medium', item?.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{goal}</span></button>; })}</div></div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-indigo-600" />Topics</h5><div className="space-y-2 mt-3">{week.topics.map((topic, idx) => <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium"><div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />{topic}</div>)}</div></div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5 text-cyan-600" />Resources</h5><div className="space-y-2 mt-3">{week.resources.map((res, idx) => <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:underline"><ChevronRight className="h-3 w-3 flex-shrink-0" /><span className="truncate">{res.title}</span></a>)}</div></div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4"><h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-600" />Practice</h5><div className="space-y-3 mt-3">{(() => { const grouped = splitPracticeItems(week.practice); const renderPractice = (entry: { task: string; index: number }) => { const item = week.items?.find(i => i.item_type === 'practice' && i.item_index === entry.index); return <button type="button" key={entry.index} className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50" onClick={() => item && progressMutation.mutate({ roadmapId: latestRoadmap.id, week: week.week, item_type: 'practice', item_index: entry.index, completed: !item.completed })}><div className={cn('h-4 w-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0', item?.completed ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300')}>{item?.completed && <CheckCircle2 className="h-3 w-3 text-white" />}</div><span className={cn('text-xs font-medium', item?.completed ? 'line-through text-slate-400' : 'text-slate-700')}>{entry.task}</span></button>; }; return <>{grouped.tests.length > 0 && <div className="space-y-1"><div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Practice Tests</div>{grouped.tests.map(renderPractice)}<Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-50" onClick={() => navigate('/faculty/practice')}>Open AI Practice Tests</Button></div>}{grouped.required.length > 0 && <div className="space-y-1"><div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Required</div>{grouped.required.map(renderPractice)}</div>}{grouped.regular.length > 0 && <div className="space-y-1">{grouped.regular.map(renderPractice)}</div>}</>; })()}</div></div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </section>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Build Your AI Growth Plan</h1>
                <p className="text-slate-600 max-w-2xl mx-auto">Generate a structured weekly roadmap with goals, topics, practice tasks, and resources.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 p-6 md:p-8 border-slate-200 shadow-sm">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Skill</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setRmSkillMode('predefined'); setRmCustomSkill(''); }} className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', rmSkillMode === 'predefined' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>From Library</button>
                                <button type="button" onClick={() => { setRmSkillMode('custom'); setRmSelectedSkill(''); }} className={cn('px-4 py-2 rounded-xl text-xs font-bold transition-all', rmSkillMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>Custom Skill</button>
                            </div>
                            {rmSkillMode === 'predefined' ? (
                                <select value={rmSelectedSkill} onChange={(e) => setRmSelectedSkill(e.target.value)} className="w-full h-12 rounded-xl border border-slate-300 px-4 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                                    <option value="">Select a skill...</option>
                                    {allSkills?.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            ) : (
                                <div className="space-y-1">
                                    <input type="text" value={rmCustomSkill} onChange={(e) => setRmCustomSkill(e.target.value)} placeholder="Example: Advanced React Hooks, Docker, Machine Learning" maxLength={60} className={cn('w-full h-12 rounded-xl border px-4 text-sm font-medium bg-white outline-none', rmCustomSkill.length > 0 && !isCustomValid ? 'border-red-300 focus:ring-2 focus:ring-red-400' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500')} />
                                    {rmCustomSkill.length > 0 && !isCustomValid && <p className="text-xs text-red-600 font-medium">Skill name must be between 2 and 60 characters.</p>}
                                    <p className="text-xs text-slate-500 text-right">{rmCustomSkill.length}/60</p>
                                </div>
                            )}
                            {rmSkillMode === 'predefined' && (!allSkills || allSkills.length === 0) && (
                                <p className="text-xs text-amber-600 font-medium">No skills found in library. Switch to custom skill to generate roadmap.</p>
                            )}
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Current Level</label>
                            <div className="grid gap-3 md:grid-cols-3">
                                {SKILL_LEVELS.map((level) => (
                                    <button type="button" key={level.value} onClick={() => setRmLevel(level.value)} className={cn('text-left p-4 rounded-2xl border transition-all', rmLevel === level.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
                                        <p className={cn('text-sm font-black', rmLevel === level.value ? 'text-blue-700' : 'text-slate-800')}>{level.label}</p>
                                        <p className="text-xs text-slate-500 mt-1">{level.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-widest text-slate-500">Duration</label><span className="text-base font-black text-slate-900">{rmWeeks} weeks</span></div><input type="range" min={1} max={52} step={1} value={rmWeeks} onChange={(e) => setRmWeeks(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" /></div>
                        <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-xs font-black uppercase tracking-widest text-slate-500">Weekly Commitment</label><span className="text-base font-black text-slate-900">{rmHours} hrs/week</span></div><input type="range" min={1} max={40} step={1} value={rmHours} onChange={(e) => setRmHours(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" /></div>
                        <Button className="w-full h-14 text-base font-black rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => isFormValid && generateMutation.mutate({ skill: effectiveSkill, weeks: rmWeeks, hours_per_week: rmHours, current_level: rmLevel })} disabled={!isFormValid || generateMutation.isPending}>
                            {generateMutation.isPending ? <span className="flex items-center gap-2"><RefreshCw className="h-5 w-5 animate-spin" />Generating roadmap...</span> : <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" />Generate Growth Plan</span>}
                        </Button>
                        {generateMutation.isError && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">Failed to generate roadmap. Please try again.</div>}
                    </div>
                </Card>
                <Card className="p-6 border-slate-200 shadow-sm">
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-slate-900">Plan Preview</h2>
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50"><p className="text-xs font-bold uppercase text-slate-500">Focus Skill</p><p className="mt-2 text-sm font-bold text-slate-900">{effectiveSkill || 'Select or enter a skill'}</p></div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50"><p className="text-xs font-bold uppercase text-slate-500">Timeline</p><p className="mt-2 text-sm font-bold text-slate-900">{rmWeeks} weeks x {rmHours} hrs/week</p><p className="text-xs text-slate-500 mt-1">{plannedHours} planned hours total</p></div>
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">Tip: use a realistic weekly commitment. Consistency beats intensity.</div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
