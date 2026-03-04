import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { skillsApi } from '../../lib/api/skills';
import { roadmapsApi, type RoadmapResponse } from '../../lib/api/roadmaps';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
    Sparkles, RefreshCw, CheckCircle2, BookOpen,
    Activity, Target, ChevronRight, TrendingUp,
    Calendar, ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Skill Level Options ──────────────────────────────────────
const SKILL_LEVELS = [
    { value: 'beginner', label: 'Beginner', emoji: '🌱', desc: 'New to this, starting from scratch' },
    { value: 'intermediate', label: 'Intermediate', emoji: '🚀', desc: 'Know the basics, want to level up' },
    { value: 'advanced', label: 'Advanced', emoji: '⚡', desc: 'Experienced, seeking mastery' },
] as const;

export default function AIGrowthPlan() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [rmSkillMode, setRmSkillMode] = useState<'predefined' | 'custom'>('predefined');
    const [rmSelectedSkill, setRmSelectedSkill] = useState('');
    const [rmCustomSkill, setRmCustomSkill] = useState('');
    const [rmWeeks, setRmWeeks] = useState(4);
    const [rmHours, setRmHours] = useState(10);
    const [rmLevel, setRmLevel] = useState<string>('beginner');

    const { data: allSkills } = useQuery({
        queryKey: ['all-skills'],
        queryFn: () => skillsApi.listSkills(),
    });

    const { data: latestRoadmap, isLoading: isLoadingRoadmap } = useQuery({
        queryKey: ['roadmap-latest', user?.id],
        queryFn: () => roadmapsApi.getLatest(),
        enabled: !!user,
        retry: false,
    });

    const generateMutation = useMutation({
        mutationFn: (data: { skill: string; weeks: number; hours_per_week: number; current_level: string }) =>
            roadmapsApi.generate(data),
        onSuccess: () => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['roadmap-latest'] });
        },
    });

    const progressMutation = useMutation({
        mutationFn: (data: { roadmapId: string; week: number; item_type: 'goal' | 'practice'; item_index: number; completed: boolean }) =>
            roadmapsApi.updateProgress(data.roadmapId, {
                week: data.week,
                item_type: data.item_type,
                item_index: data.item_index,
                completed: data.completed,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roadmap-latest'] });
        },
    });

    const effectiveSkill = rmSkillMode === 'custom' ? rmCustomSkill.trim() : rmSelectedSkill;
    const isCustomValid = rmCustomSkill.trim().length >= 2 && rmCustomSkill.trim().length <= 60;
    const isFormValid = rmSkillMode === 'custom' ? isCustomValid : !!rmSelectedSkill;

    const handleGenerate = () => {
        if (!isFormValid) return;
        generateMutation.mutate({
            skill: effectiveSkill,
            weeks: rmWeeks,
            hours_per_week: rmHours,
            current_level: rmLevel,
        });
    };

    const handleNewRoadmap = () => {
        setShowForm(true);
        setRmSelectedSkill('');
        setRmCustomSkill('');
        setRmWeeks(4);
        setRmHours(10);
        setRmLevel('beginner');
        generateMutation.reset();
    };

    // Compute week completion %
    const getWeekCompletion = (week: RoadmapResponse['weekly_plan'][0]) => {
        if (!week.items || week.items.length === 0) return 0;
        const done = week.items.filter(i => i.completed).length;
        return Math.round((done / week.items.length) * 100);
    };

    // ─── Loading State ──────────────────────────────────────────
    if (isLoadingRoadmap) {
        return (
            <div className="flex bg-gray-50 h-[400px] items-center justify-center p-8 rounded-2xl border border-gray-100">
                <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
            </div>
        );
    }

    // ─── Show Existing Roadmap ──────────────────────────────────
    if (latestRoadmap && !showForm && !generateMutation.isPending) {
        return (
            <div className="space-y-8 pb-12 animate-in fade-in duration-500">
                {/* Header */}
                <div className="relative p-8 rounded-3xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                    <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center">
                        <div className="md:col-span-2 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-violet-50 hover:bg-violet-100 text-violet-600 border-none py-1 px-3 font-bold">
                                    <Sparkles className="h-3 w-3 mr-1.5" /> AI ROADMAP
                                </Badge>
                                <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold py-1">
                                    {latestRoadmap.weeks} WEEKS • {latestRoadmap.hours_per_week}h/wk
                                </Badge>
                                <Badge variant="outline" className="border-violet-200 text-violet-500 font-bold py-1 capitalize">
                                    {latestRoadmap.current_level}
                                </Badge>
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
                                Roadmap: <span className="text-violet-600">{latestRoadmap.skill}</span>
                            </h1>
                            <p className="text-slate-500 flex items-center gap-2 font-medium">
                                <Calendar className="h-4 w-4" />
                                Generated {new Date(latestRoadmap.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center p-6 bg-violet-50/50 rounded-2xl border border-violet-100 relative">
                            <div className="absolute top-2 right-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-bold text-slate-400 hover:text-violet-600 hover:bg-violet-50 h-7 px-2 rounded-lg gap-1.5"
                                    onClick={handleNewRoadmap}
                                >
                                    <RefreshCw className="h-3 w-3" /> NEW ROADMAP
                                </Button>
                            </div>
                            {(() => {
                                const totalItems = latestRoadmap.weekly_plan.reduce((sum, w) => sum + (w.items?.length || 0), 0);
                                const doneItems = latestRoadmap.weekly_plan.reduce((sum, w) => sum + (w.items?.filter(i => i.completed).length || 0), 0);
                                const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
                                return (
                                    <>
                                        <div className="text-5xl font-black mb-1 text-slate-900">{pct}%</div>
                                        <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-violet-600 mb-4 opacity-80">Overall Progress</div>
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-violet-600 rounded-full transition-all duration-1000 shadow-md shadow-violet-500/20" style={{ width: `${pct}%` }} />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
                </div>

                {/* Weekly Cards */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <TrendingUp className="h-5 w-5 text-violet-600" />
                        Weekly Plan
                    </h3>
                    {latestRoadmap.weekly_plan.map((week) => {
                        const weekPct = getWeekCompletion(week);
                        return (
                            <Card key={week.week} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-200">
                                <div className="flex h-full">
                                    <div className={cn("w-2 flex-shrink-0", weekPct >= 100 ? "bg-emerald-500" : "bg-violet-600")} />
                                    <div className="flex-1 p-6 space-y-5">
                                        {/* Week header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs ring-4 ring-white shadow-sm",
                                                    weekPct >= 100 ? "bg-emerald-600 text-white" : "bg-violet-600 text-white"
                                                )}>{week.week}</span>
                                                <h4 className="font-bold text-xl text-gray-900">Week {week.week}</h4>
                                                {weekPct >= 100 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 flex gap-1 h-6"><CheckCircle2 className="h-3 w-3" /> COMPLETE</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400">{weekPct}%</span>
                                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full transition-all", weekPct >= 100 ? "bg-emerald-500" : "bg-violet-400")} style={{ width: `${weekPct}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                                            {/* Goals */}
                                            <div className="space-y-3">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Target className="h-3 w-3" /> Goals
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.goals.map((goal, idx) => {
                                                        const item = week.items?.find(i => i.item_type === 'goal' && i.item_index === idx);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                                                                onClick={() => item && progressMutation.mutate({
                                                                    roadmapId: latestRoadmap.id,
                                                                    week: week.week,
                                                                    item_type: 'goal',
                                                                    item_index: idx,
                                                                    completed: !item.completed,
                                                                })}
                                                            >
                                                                <div className={cn(
                                                                    "h-4 w-4 mt-0.5 rounded border flex items-center justify-center transition-all flex-shrink-0",
                                                                    item?.completed ? "bg-violet-600 border-violet-600" : "border-gray-300 group-hover:border-violet-400"
                                                                )}>
                                                                    {item?.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                                </div>
                                                                <span className={cn("text-xs font-medium", item?.completed ? "text-gray-400 line-through" : "text-gray-700")}>{goal}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Topics */}
                                            <div className="space-y-3">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <BookOpen className="h-3 w-3" /> Topics
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.topics.map((topic, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                                                            {topic}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Resources */}
                                            <div className="space-y-3">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <ArrowRight className="h-3 w-3" /> Resources
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.resources.map((res, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={res.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline truncate"
                                                        >
                                                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                            {res.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Practice */}
                                            <div className="space-y-3">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Activity className="h-3 w-3" /> Practice
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.practice.map((task, idx) => {
                                                        const item = week.items?.find(i => i.item_type === 'practice' && i.item_index === idx);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                                                                onClick={() => item && progressMutation.mutate({
                                                                    roadmapId: latestRoadmap.id,
                                                                    week: week.week,
                                                                    item_type: 'practice',
                                                                    item_index: idx,
                                                                    completed: !item.completed,
                                                                })}
                                                            >
                                                                <div className={cn(
                                                                    "h-4 w-4 mt-0.5 rounded border flex items-center justify-center transition-all flex-shrink-0",
                                                                    item?.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 group-hover:border-emerald-400"
                                                                )}>
                                                                    {item?.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                                </div>
                                                                <span className={cn("text-xs font-medium", item?.completed ? "text-gray-400 line-through" : "text-gray-700")}>{task}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── Roadmap Generator Form ────────────────────────────────
    return (
        <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-3">
                <div className="h-20 w-20 mx-auto rounded-3xl bg-violet-100 flex items-center justify-center rotate-3 shadow-inner">
                    <Sparkles className="h-10 w-10 text-violet-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">Generate Learning Roadmap</h1>
                <p className="text-gray-500 max-w-md mx-auto">Create a structured, AI-powered week-by-week plan to master any skill.</p>
            </div>

            <Card className="p-8 border-none shadow-2xl bg-white overflow-hidden relative">
                <div className="space-y-6 relative z-10">
                    {/* Skill Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Skill to Learn</label>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => { setRmSkillMode('predefined'); setRmCustomSkill(''); }}
                                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", rmSkillMode === 'predefined' ? "bg-violet-600 text-white shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                            >From Skills List</button>
                            <button
                                onClick={() => { setRmSkillMode('custom'); setRmSelectedSkill(''); }}
                                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", rmSkillMode === 'custom' ? "bg-violet-600 text-white shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                            >Custom Skill</button>
                        </div>

                        {rmSkillMode === 'predefined' ? (
                            <select
                                value={rmSelectedSkill}
                                onChange={(e) => setRmSelectedSkill(e.target.value)}
                                className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm font-medium bg-gray-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                            >
                                <option value="">Select a skill...</option>
                                {allSkills?.map((s) => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    value={rmCustomSkill}
                                    onChange={(e) => setRmCustomSkill(e.target.value)}
                                    placeholder="e.g. Advanced React Hooks, Docker, Machine Learning..."
                                    maxLength={60}
                                    className={cn(
                                        "w-full h-12 rounded-xl border px-4 text-sm font-medium bg-gray-50 outline-none transition-all",
                                        rmCustomSkill.length > 0 && !isCustomValid
                                            ? "border-red-300 focus:ring-2 focus:ring-red-400"
                                            : "border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                    )}
                                />
                                {rmCustomSkill.length > 0 && !isCustomValid && (
                                    <p className="text-xs text-red-500 font-medium">Skill name must be 2–60 characters</p>
                                )}
                                <p className="text-xs text-gray-400 text-right">{rmCustomSkill.length}/60</p>
                            </div>
                        )}
                    </div>

                    {/* Current Skill Level */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Your Current Level</label>
                        <div className="grid grid-cols-3 gap-3">
                            {SKILL_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    onClick={() => setRmLevel(level.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center",
                                        rmLevel === level.value
                                            ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-100"
                                            : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                                    )}
                                >
                                    <span className="text-2xl">{level.emoji}</span>
                                    <span className={cn("text-sm font-bold", rmLevel === level.value ? "text-violet-700" : "text-gray-700")}>{level.label}</span>
                                    <span className="text-[10px] text-gray-400 leading-tight">{level.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Weeks Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Duration</label>
                            <span className="text-lg font-black text-gray-900">{rmWeeks} <span className="text-gray-400 text-xs font-medium">weeks</span></span>
                        </div>
                        <input
                            type="range"
                            min={1} max={52} step={1}
                            value={rmWeeks}
                            onChange={(e) => setRmWeeks(Number(e.target.value))}
                            className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-violet-600"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-gray-300">
                            <span>1 wk</span><span>13 wk</span><span>26 wk</span><span>52 wk</span>
                        </div>
                    </div>

                    {/* Hours per Week Selector */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Weekly Commitment</label>
                            <span className="text-lg font-black text-gray-900">{rmHours} <span className="text-gray-400 text-xs font-medium">hrs / week</span></span>
                        </div>
                        <input
                            type="range"
                            min={1} max={40} step={1}
                            value={rmHours}
                            onChange={(e) => setRmHours(Number(e.target.value))}
                            className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-violet-600"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-gray-300">
                            <span>1 hr</span><span>10 hr</span><span>20 hr</span><span>40 hr</span>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        className="w-full h-16 text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all bg-violet-600 hover:bg-violet-700"
                        onClick={handleGenerate}
                        disabled={!isFormValid || generateMutation.isPending}
                    >
                        {generateMutation.isPending ? (
                            <div className="flex items-center gap-3">
                                <RefreshCw className="h-6 w-6 animate-spin" />
                                Generating Roadmap...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-6 w-6" />
                                Generate Roadmap
                            </div>
                        )}
                    </Button>

                    {generateMutation.isError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                            Failed to generate roadmap. Please try again.
                        </div>
                    )}
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            </Card>
        </div>
    );
}
