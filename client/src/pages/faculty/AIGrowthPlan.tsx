import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/providers/AuthProvider';
import { growthPlansApi } from '../../lib/api/growthPlans';
import { skillsApi, SkillDomain } from '../../lib/api/skills';
import { api } from '../../lib/api/mockApi'; // Keep for careerGoals
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
    Target,
    ChevronRight,
    Sparkles,
    Calendar,
    CheckCircle2,
    TrendingUp,
    BrainCircuit,
    Award,
    BookOpen,
    ArrowRight,
    RefreshCw,
    Clock,
    Activity
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { Domain } from '../../lib/types';
import { AddNewItemModal } from '../../components/shared/AddNewItemModal';

export default function AIGrowthPlan() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
    const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
    const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);

    // Setup state
    const [setupMode, setSetupMode] = useState<'GOAL' | 'SKILL' | ''>('');
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [selectedDomain, setSelectedDomain] = useState<Domain | ''>('');
    const [selectedSkill, setSelectedSkill] = useState<string>('');
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [targetLevel, setTargetLevel] = useState<number>(3);
    const [weeklyHours, setWeeklyHours] = useState<number>(10);

    const { data: rawPlan, isLoading: isLoadingPlan } = useQuery({
        queryKey: ['growth-plan', user?.id],
        queryFn: () => growthPlansApi.getMyActivePlan(),
        enabled: !!user,
        retry: false, // Don't retry if 404
    });

    // Map backend plan to frontend expected structure
    const currentPlan = rawPlan ? {
        id: rawPlan.id,
        domain: rawPlan.domain,
        skill: rawPlan.target_skill,
        startDate: rawPlan.created_at,
        targetLevel: rawPlan.target_level,
        progressPercentage: rawPlan.progress_percentage,
        weeklyHours: rawPlan.weekly_hours,
        roadmapWeeks: rawPlan.weeks?.map(w => ({
            id: w.id,
            weekNumber: w.week_number,
            title: w.title,
            taskDescription: w.title, // Use title as description if not separate
            topics: [w.title], // Mock topics from title
            requiredPracticeCount: w.required_practice_count,
            completedPracticeCount: w.completed_practice_count,
            requiredMinAvgScore: w.required_min_avg_score,
            avgScoreForWeek: w.avg_score_for_week,
            completed: w.completed,
            tasks: w.tasks.map(t => ({
                id: t.id,
                label: t.label,
                done: t.done
            }))
        })) || []
    } : null;

    const { data: allSkills } = useQuery({
        queryKey: ['all-skills'],
        queryFn: () => skillsApi.listSkills(),
    });

    const { data: careerGoals } = useQuery({
        queryKey: ['career-goals'],
        queryFn: api.careerGoals.getAll,
        enabled: setupStep > 0
    });

    const createPlanMutation = useMutation({
        mutationFn: (params: any) => growthPlansApi.createPlan({
            domain: params.domain,
            target_skill: params.skill,
            current_level: params.currentLevel,
            target_level: params.targetLevel,
            weekly_hours: params.weeklyHours
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['growth-plan'] });
            setSetupStep(0);
        }
    });


    const resetPlanMutation = useMutation({
        mutationFn: () => growthPlansApi.hardReset(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['growth-plan'] });
            setSetupStep(0);
            setSelectedDomain('');
            setSelectedSkill('');
        }
    });

    const completeWeekMutation = useMutation({
        mutationFn: ({ weekId }: { weekId: string }) =>
            growthPlansApi.completeWeek(weekId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['growth-plan'] });
        }
    });

    const toggleTaskMutation = useMutation({
        mutationFn: ({ taskId, done }: { taskId: string, done: boolean }) =>
            growthPlansApi.updateTaskStatus(taskId, done),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['growth-plan'] });
        }
    });


    const handleStartSetup = () => {
        setSetupStep(1);
    };

    const handleGenerate = () => {
        if (!user || !selectedSkill) return;

        // Map shorthand domain to backend SkillDomain
        const domainMap: Record<string, SkillDomain> = {
            'AI': SkillDomain.AI,
            'CLOUD': SkillDomain.CLOUD,
            'CYBERSECURITY': SkillDomain.CYBER,
            'DBMS': SkillDomain.TECHNOLOGY,
            'PEDAGOGY': SkillDomain.TEACHING
        };

        createPlanMutation.mutate({
            facultyId: user.id,
            domain: domainMap[selectedDomain] || SkillDomain.TECHNOLOGY,
            skill: selectedSkill,
            currentLevel,
            targetLevel,
            weeklyHours,
            startDate: new Date().toISOString()
        });
    };

    if (isLoadingPlan) {
        return (
            <div className="flex bg-gray-50 h-[400px] items-center justify-center p-8 rounded-2xl border border-gray-100">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // --- WIZARD VIEW ---
    if (!currentPlan || setupStep > 0) {
        if (setupStep === 1) { // Path Selection
            return (
                <div className="max-w-4xl mx-auto py-8">
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl font-black mb-3">Define Your Growth Path</h1>
                        <p className="text-gray-500 text-lg">Choose how you want to structure your development journey.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card
                            className={cn(
                                "cursor-pointer transition-all hover:scale-[1.02] border-2",
                                setupMode === 'GOAL' ? "border-primary bg-primary/5 shadow-xl" : "hover:border-primary/50"
                            )}
                            onClick={() => setSetupMode('GOAL')}
                        >
                            <CardHeader className="p-8 text-center flex flex-col items-center gap-4">
                                <div className={cn("p-4 rounded-3xl", setupMode === 'GOAL' ? "bg-primary text-white" : "bg-gray-100 text-gray-400")}>
                                    <Award className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-xl font-bold">Career Milestone</CardTitle>
                                    <p className="text-sm text-gray-500 leading-relaxed">Focus on reaching a specific professional role like "Senior AI Researcher" or "Cloud Architect".</p>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card
                            className={cn(
                                "cursor-pointer transition-all hover:scale-[1.02] border-2",
                                setupMode === 'SKILL' ? "border-primary bg-primary/5 shadow-xl" : "hover:border-primary/50"
                            )}
                            onClick={() => setSetupMode('SKILL')}
                        >
                            <CardHeader className="p-8 text-center flex flex-col items-center gap-4">
                                <div className={cn("p-4 rounded-3xl", setupMode === 'SKILL' ? "bg-primary text-white" : "bg-gray-100 text-gray-400")}>
                                    <BrainCircuit className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-xl font-bold">Custom Skill focus</CardTitle>
                                    <p className="text-sm text-gray-500 leading-relaxed">Master a specific technology or topic regardless of career titles, like "Advanced React Hooks" or "SQL Optimization".</p>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-6">
                        <Button
                            size="lg"
                            className="px-12 h-14 text-lg rounded-full shadow-lg"
                            disabled={!setupMode}
                            onClick={() => setSetupStep(2)}
                        >
                            Continue <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button variant="ghost" onClick={() => navigate('/faculty/dashboard')}>Back to Dashboard</Button>
                    </div>
                </div>
            );
        }

        if (setupStep === 2) { // Goal or Domain Selection
            return (
                <div className="max-w-4xl mx-auto py-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold mb-2">
                            {setupMode === 'GOAL' ? 'Pick Your Destination' : 'Choose Your Domain'}
                        </h1>
                        <p className="text-gray-500">{setupMode === 'GOAL' ? 'Select a professional milestone to work towards.' : 'Select the primary field of expertise.'}</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {setupMode === 'GOAL' ? (
                            careerGoals?.map(goal => (
                                <Card
                                    key={goal.id}
                                    className={cn("cursor-pointer transition-all hover:border-primary", selectedGoalId === goal.id ? "border-2 border-primary bg-primary/5 shadow-md" : "")}
                                    onClick={() => {
                                        setSelectedGoalId(goal.id);
                                        setSelectedDomain(goal.recommendedDomain);
                                        setSelectedSkill('');
                                    }}
                                >
                                    <CardHeader className="p-5">
                                        <CardTitle className="text-sm font-bold flex justify-between items-start">
                                            {goal.title}
                                            {selectedGoalId === goal.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                        </CardTitle>
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{goal.description}</p>
                                        <Badge variant="secondary" className="mt-4 text-[10px] uppercase font-bold text-primary bg-primary/5 border-none">{goal.recommendedDomain}</Badge>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            (['DBMS', 'AI', 'CLOUD', 'CYBERSECURITY', 'PEDAGOGY'] as Domain[]).map(domain => (
                                <Card
                                    key={domain}
                                    className={cn("cursor-pointer transition-all hover:border-primary flex flex-col items-center p-6 gap-3", selectedDomain === domain ? "border-2 border-primary bg-primary/5" : "")}
                                    onClick={() => {
                                        setSelectedDomain(domain);
                                        setSelectedSkill('');
                                    }}
                                >
                                    <div className={cn("p-4 rounded-2xl", selectedDomain === domain ? "bg-primary text-white" : "bg-gray-100 text-gray-400")}>
                                        <Target className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-xs font-black uppercase tracking-wider">{domain}</CardTitle>
                                </Card>
                            ))
                        )}
                    </div>

                    <div className="mt-12 flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full px-8 h-12" onClick={() => setSetupStep(1)}>Back</Button>
                        <Button
                            className="rounded-full px-12 h-12"
                            disabled={setupMode === 'GOAL' ? !selectedGoalId : !selectedDomain}
                            onClick={() => setSetupStep(3)}
                        >
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (setupStep === 3) { // Skill Selection
            const goal = careerGoals?.find(g => g.id === selectedGoalId);
            const skillsToSelect = setupMode === 'GOAL' && goal
                ? goal.requiredSkills.map((s: any) => ({ name: s.name, level: s.requiredLevel }))
                : allSkills?.filter((s: any) => s.category?.toLowerCase() === selectedDomain?.toLowerCase()).map((s: any) => ({ name: s.name, level: s.level })) || [];

            return (
                <div className="max-w-4xl mx-auto py-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold mb-2">Select Your Focus</h1>
                        <p className="text-gray-500">Pick the specific skill you want to develop {setupMode === 'GOAL' && 'for this path'}.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {skillsToSelect.map((skill: any, i: number) => (
                            <Card
                                key={i}
                                className={cn("cursor-pointer transition-all hover:border-primary", selectedSkill === skill.name ? "border-2 border-primary bg-primary/5" : "")}
                                onClick={() => setSelectedSkill(skill.name)}
                            >
                                <CardHeader className="p-4 flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-bold">{skill.name}</CardTitle>
                                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-gray-400 border-gray-200">
                                            {typeof skill.level === 'number' ? `Lvl ${skill.level}` : skill.level}
                                        </Badge>
                                    </div>
                                    {selectedSkill === skill.name && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                </CardHeader>
                            </Card>
                        ))}
                        <Card
                            className="cursor-pointer border-dashed border-2 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center p-6 gap-2"
                            onClick={() => setIsAddSkillModalOpen(true)}
                        >
                            <Sparkles className="h-5 w-5 text-gray-400" />
                            <span className="text-[10px] font-bold uppercase text-gray-500">Add Custom Skill</span>
                        </Card>
                    </div>

                    <div className="mt-12 flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full px-8 h-12" onClick={() => setSetupStep(2)}>Back</Button>
                        <Button className="rounded-full px-12 h-12" disabled={!selectedSkill} onClick={() => setSetupStep(4)}>
                            Set Proficiency <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (setupStep === 4) { // Proficiency Calibration
            return (
                <div className="max-w-4xl mx-auto py-8">
                    <div className="mb-12 text-center">
                        <h1 className="text-3xl font-bold mb-2">Proficiency Calibration</h1>
                        <p className="text-gray-500">Where are you now, and where do you want to be?</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Current Level */}
                        <Card className="p-8 border-none shadow-xl bg-white">
                            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6 text-center">Current Level</h3>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => {
                                            setCurrentLevel(lvl);
                                            if (lvl >= targetLevel) setTargetLevel(Math.min(5, lvl + 1));
                                        }}
                                        className={cn("h-10 w-10 rounded-lg font-bold transition-all", currentLevel === lvl ? "bg-indigo-600 text-white shadow-lg scale-110" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs font-bold text-indigo-600 uppercase">
                                {['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'][currentLevel - 1]}
                            </p>
                        </Card>

                        {/* Target Level */}
                        <Card className="p-8 border-slate-200 shadow-xl bg-white">
                            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-6 text-center">Target Goal</h3>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map(lvl => (
                                    <button
                                        key={lvl}
                                        disabled={lvl <= currentLevel}
                                        onClick={() => setTargetLevel(lvl)}
                                        className={cn(
                                            "h-10 w-10 rounded-lg font-bold transition-all",
                                            targetLevel === lvl ? "bg-emerald-500 text-white shadow-lg scale-110" : "bg-slate-50 text-slate-400",
                                            lvl <= currentLevel ? "opacity-20 cursor-not-allowed" : "hover:bg-slate-100"
                                        )}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs font-bold text-emerald-600 uppercase">
                                {['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'][targetLevel - 1]}
                            </p>
                        </Card>
                    </div>

                    <div className="mt-12 flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full px-8 h-12" onClick={() => setSetupStep(3)}>Back</Button>
                        <Button className="rounded-full px-12 h-12" onClick={() => setSetupStep(5)}>
                            Final Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (setupStep === 5) { // Schedule
            return (
                <div className="max-w-2xl mx-auto py-8">
                    <div className="mb-12 text-center">
                        <h1 className="text-3xl font-bold mb-2">Set Your Pace</h1>
                        <p className="text-gray-500">How much time can you realistically invest each week?</p>
                    </div>

                    <Card className="p-10 border-none shadow-2xl bg-white overflow-hidden relative">
                        <div className="space-y-8 relative z-10">
                            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Weekly Commitment</p>
                                        <p className="text-2xl font-black text-gray-900">{weeklyHours} Hours <span className="text-gray-400 text-xs font-medium">/ Week</span></p>
                                    </div>
                                </div>
                            </div>

                            <input
                                type="range"
                                min="2" max="30" step="2"
                                value={weeklyHours}
                                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                                className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary"
                            />

                            <div className="pt-6 space-y-4">
                                <Button
                                    className="w-full h-16 text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all"
                                    onClick={handleGenerate}
                                    disabled={createPlanMutation.isPending}
                                >
                                    {createPlanMutation.isPending ? (
                                        <div className="flex items-center gap-3">
                                            <RefreshCw className="h-6 w-6 animate-spin" />
                                            Architecting Roadmap...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-6 w-6" />
                                            Assemble Global Growth Plan
                                        </div>
                                    )}
                                </Button>
                                <Button variant="ghost" className="w-full" onClick={() => setSetupStep(4)}>Edit Calibration</Button>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    </Card>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600" />
                <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <BrainCircuit className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-3xl font-extrabold mb-3 text-gray-900">Your AI Career Partner</h2>
                <p className="text-gray-500 max-w-sm text-center mb-10 text-lg leading-relaxed">
                    Build a structured, data-driven roadmap to master any skill in 8-12 weeks.
                </p>
                <Button size="lg" className="h-14 px-12 rounded-2xl text-lg font-bold shadow-2xl hover:scale-105 transition-transform" onClick={handleStartSetup}>
                    Get Started <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
            </div>
        );
    }

    // --- MAIN ROADMAP VIEW ---
    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Elegant Header Section */}
            <div className="relative p-8 rounded-3xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center">
                    <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-none py-1 px-3 font-bold">
                                <Sparkles className="h-3 w-3 mr-1.5" /> AI ENGINE: GPT-4o
                            </Badge>
                            <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold py-1 transition-all hover:bg-slate-50 cursor-pointer">
                                {currentPlan.domain} SPECIALIST
                            </Badge>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
                            Roadmap: <span className="text-blue-600">{currentPlan.skill}</span>
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2 font-medium">
                            <Calendar className="h-4 w-4" />
                            Started {format(parseISO(currentPlan.startDate), 'MMMM d, yyyy')} • Target Level: {currentPlan.targetLevel}/5
                        </p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100 relative">
                        <div className="absolute top-2 right-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 h-7 px-2 rounded-lg gap-1.5"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("This will delete your current plan, progress, and weekly completion status. Continue?")) {
                                        resetPlanMutation.mutate();
                                    }
                                }}
                            >
                                <RefreshCw className="h-3 w-3" /> RESET PLAN
                            </Button>
                        </div>
                        <div className="text-5xl font-black mb-1 text-slate-900">{currentPlan.progressPercentage}%</div>
                        <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-600 mb-4 opacity-80">Overall Progress</div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-md shadow-blue-500/20" style={{ width: `${currentPlan.progressPercentage}%` }} />
                        </div>
                    </div>
                </div>
                {/* Abstract decorative elements */}
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="grid gap-8 lg:grid-cols-7">
                {/* 8-12 Week Timeline */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                            Weekly Momentum
                        </h3>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600">8-12 WEEKS</Badge>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 uppercase">Self-Paced ({currentPlan.weeklyHours}h/wk)</Badge>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {currentPlan.roadmapWeeks.map((week) => (
                            <Card
                                key={week.weekNumber}
                                className={cn(
                                    "overflow-hidden transition-all duration-300",
                                    week.completed ? "bg-gray-50/80 border-gray-100 shadow-none grayscale-[0.3]" : "hover:shadow-xl hover:-translate-y-1 border-gray-200 cursor-pointer"
                                )}
                                onClick={() => setSelectedWeekNumber(week.weekNumber)}
                            >
                                <div className="flex h-full">
                                    {/* Week Indicator Bar */}
                                    <div className={cn(
                                        "w-2 flex-shrink-0",
                                        week.completed ? "bg-emerald-500" : "bg-indigo-600"
                                    )} />

                                    <div className="flex-1 p-6">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-xs ring-4 ring-white shadow-sm",
                                                        week.completed ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                                                    )}>
                                                        {week.weekNumber}
                                                    </span>
                                                    <h4 className="font-bold text-xl text-gray-900">
                                                        {week.completed ? 'Goal Achieved' : `Week ${week.weekNumber}`}
                                                    </h4>
                                                    {week.completed && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 flex gap-1 h-6"><CheckCircle2 className="h-3 w-3" /> VERIFIED</Badge>}
                                                </div>
                                                <p className="text-gray-500 font-medium text-sm ml-11">{week.taskDescription}</p>
                                            </div>
                                            <Button
                                                variant={week.completed ? "ghost" : "default"}
                                                size="sm"
                                                className={cn(
                                                    "rounded-full h-10 px-6 font-bold transition-all",
                                                    week.completed ? "text-emerald-600 hover:bg-emerald-50" : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (week.completed) {
                                                        completeWeekMutation.mutate({ weekId: week.id }); // Should probably be a revert endpoint if available, but for now reuse
                                                    } else {
                                                        const unmet = [];
                                                        if (week.completedPracticeCount < week.requiredPracticeCount) unmet.push(`Practice sets: ${week.completedPracticeCount}/${week.requiredPracticeCount}`);
                                                        if (week.avgScoreForWeek < week.requiredMinAvgScore) unmet.push(`Avg Score: ${week.avgScoreForWeek}% / ${week.requiredMinAvgScore}%`);
                                                        if (!week.tasks.every(t => t.done)) unmet.push("Checklist items incomplete");

                                                        if (unmet.length > 0) {
                                                            alert(`Incomplete Requirements:\n- ${unmet.join('\n- ')}`);
                                                        } else {
                                                            completeWeekMutation.mutate({ weekId: week.id });
                                                        }
                                                    }
                                                }}
                                            >
                                                {week.completed ? 'Reopen Week' : 'Complete Week'}
                                            </Button>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-6 ml-11">
                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <BookOpen className="h-3 w-3" /> Learning Focus
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.topics.map((t, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5" />
                                                            {t}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Activity className="h-3 w-3" /> Practice Progress
                                                </h5>
                                                <div className="space-y-3">
                                                    <div className="flex items-end justify-between">
                                                        <div className="text-2xl font-black text-gray-900">{week.completedPracticeCount} <span className="text-gray-400 text-sm">/ {week.requiredPracticeCount}</span></div>
                                                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-100 text-indigo-600 bg-indigo-50/30">
                                                            TARGET: {week.requiredMinAvgScore}%
                                                        </Badge>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full transition-all duration-500",
                                                                week.completedPracticeCount >= week.requiredPracticeCount ? "bg-emerald-500" : "bg-indigo-300"
                                                            )}
                                                            style={{ width: `${Math.min(100, (week.completedPracticeCount / week.requiredPracticeCount) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                                        <span>AVG. SCORE: {week.avgScoreForWeek}%</span>
                                                        <span className={week.avgScoreForWeek >= week.requiredMinAvgScore ? "text-emerald-600" : "text-amber-600"}>
                                                            {week.avgScoreForWeek >= week.requiredMinAvgScore ? 'REACHED' : 'BELOW TARGET'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-3 w-3" /> Task Checklist
                                                </h5>
                                                <div className="space-y-2">
                                                    {week.tasks?.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100/50 cursor-pointer transition-colors group"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTaskMutation.mutate({ taskId: task.id, done: !task.done });
                                                            }}
                                                        >
                                                            <div className={cn(
                                                                "h-4 w-4 rounded border flex items-center justify-center transition-all",
                                                                task.done ? "bg-indigo-600 border-indigo-600" : "border-gray-300 group-hover:border-indigo-400"
                                                            )}>
                                                                {task.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span className={cn(
                                                                "text-xs font-medium",
                                                                task.done ? "text-gray-400 line-through" : "text-gray-700"
                                                            )}>
                                                                {task.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* AI Insights & Sidebar slice */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Performance Pulse */}
                    <Card className="border-slate-100 shadow-xl bg-blue-600 text-white overflow-hidden relative group">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-widest">
                                <TrendingUp className="h-4 w-4 text-white" /> Adaptive Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-3xl font-black">Stable</div>
                                <p className="text-xs text-blue-100">Roadmap momentum is healthy</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/10 border border-white/10 text-xs font-medium leading-relaxed group-hover:bg-white/20 transition-colors">
                                "Based on your recent practice scores (avg 72%), AI suggests spending an additional 2 hours on Week {currentPlan.roadmapWeeks.find(w => !w.completed)?.weekNumber || '8'} conceptual tasks."
                            </div>
                            <Button className="w-full bg-white hover:bg-slate-50 text-blue-600 font-bold h-11 border-none shadow-lg">
                                View Detailed Streaks <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainCircuit className="h-20 w-20" />
                        </div>
                    </Card>

                    {/* Quick Links */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Practice</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-all group">
                            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Award className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Verify</span>
                        </button>
                    </div>

                    {/* AI Mentor Recommendation */}
                    <Card className="border-dashed border-2 border-gray-200 bg-transparent shadow-none p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Ready for Assessment?</h4>
                                <p className="text-xs text-gray-500 mt-1 px-4 leading-relaxed">
                                    You've completed {currentPlan.roadmapWeeks.filter(w => w.completed).length} weeks. AI recommends another 5 practice sets before attempting the final verification.
                                </p>
                            </div>
                            <Button variant="outline" className="w-full rounded-xl gap-2 font-bold text-xs h-11">
                                Build Practice Pack <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modal for adding new skill */}
            <AddNewItemModal
                isOpen={isAddSkillModalOpen}
                onClose={() => setIsAddSkillModalOpen(false)}
                title="Add New Skill"
                placeholder="e.g. Advanced React Hooks"
                description={`Tell us what specific skill in ${selectedDomain} you want to master.`}
                onAdd={async (name) => {
                    await skillsApi.createSkill({
                        name,
                        domain: (selectedDomain === 'PEDAGOGY' ? 'TEACHING' : selectedDomain) as any,
                    });
                    queryClient.invalidateQueries({ queryKey: ['all-skills'] });
                    setSelectedSkill(name);
                }}
            />

            {/* Roadmap Week Detail Modal */}
            {selectedWeekNumber && currentPlan.roadmapWeeks.find(w => w.weekNumber === selectedWeekNumber) && (() => {
                const week = currentPlan.roadmapWeeks.find(w => w.weekNumber === selectedWeekNumber)!;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-[32px] overflow-hidden border-none animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                            <div className="relative">
                                {/* Modal Header */}
                                <div className={cn(
                                    "p-8 pb-12 text-white relative overflow-hidden",
                                    week.completed ? "bg-emerald-600" : "bg-gradient-to-br from-indigo-600 to-blue-700"
                                )}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-white shadow-inner backdrop-blur-md">
                                                    {week.weekNumber}
                                                </span>
                                                <h2 className="text-3xl font-black tracking-tight">Week {week.weekNumber}</h2>
                                                {week.completed && <Badge className="bg-white/20 text-white border-white/30 uppercase text-[10px] font-black tracking-widest px-2">Completed</Badge>}
                                            </div>
                                            <p className="text-blue-50/80 font-medium text-lg max-w-md">{week.taskDescription}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedWeekNumber(null)}
                                            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                                        >
                                            <ChevronRight className="h-6 w-6 rotate-180" />
                                        </button>
                                    </div>
                                </div>

                                <CardContent className="p-8 -mt-6 bg-white rounded-t-[32px] relative z-20 space-y-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {/* Learning Focus */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-indigo-500" /> Learning Focus
                                            </h3>
                                            <div className="space-y-3">
                                                {week.topics.map((topic, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 group hover:border-indigo-200 hover:bg-white transition-all">
                                                        <div className="h-2 w-2 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
                                                        <span className="text-sm font-bold text-gray-700">{topic}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Practice Progress */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-blue-500" /> Requirements
                                            </h3>
                                            <div className="space-y-5 p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-xs font-black text-blue-900/60 uppercase">Practice Sets</span>
                                                        <span className="text-xl font-black text-blue-900">{week.completedPracticeCount} <span className="text-blue-900/40 text-sm">/ {week.requiredPracticeCount}</span></span>
                                                    </div>
                                                    <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                                            style={{ width: `${Math.min(100, (week.completedPracticeCount / week.requiredPracticeCount) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-blue-100/50">
                                                    <span className="text-xs font-black text-blue-900/60 uppercase">Min Accuracy</span>
                                                    <Badge className="bg-blue-600 text-white font-black">{week.requiredMinAvgScore}%</Badge>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-blue-900/60 uppercase">Avg Score</span>
                                                    <span className={cn(
                                                        "text-sm font-black",
                                                        week.avgScoreForWeek >= week.requiredMinAvgScore ? "text-emerald-600" : "text-amber-600"
                                                    )}>
                                                        {week.avgScoreForWeek}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Task Checklist */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Milestone Checklist
                                        </h3>
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            {week.tasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleTaskMutation.mutate({ taskId: task.id, done: !task.done });
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                                                        task.done ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50 border-gray-100 hover:border-indigo-200 hover:bg-white"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                                                        task.done ? "bg-emerald-500 scale-110 shadow-lg shadow-emerald-200" : "bg-white border-2 border-gray-200 group-hover:border-indigo-400"
                                                    )}>
                                                        {task.done && <CheckCircle2 className="h-4 w-4 text-white" />}
                                                    </div>
                                                    <span className={cn(
                                                        "text-sm font-bold transition-all",
                                                        task.done ? "text-emerald-900/40 line-through" : "text-gray-700"
                                                    )}>
                                                        {task.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="pt-4 flex gap-4">
                                        <Button
                                            variant="outline"
                                            className="grow h-14 rounded-2xl font-bold text-gray-500 border-gray-200"
                                            onClick={() => setSelectedWeekNumber(null)}
                                        >
                                            Close View
                                        </Button>
                                        <Button
                                            className={cn(
                                                "grow h-14 rounded-2xl font-black text-lg transition-all shadow-xl",
                                                week.completed ? "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (week.completed) {
                                                    // No revert for now
                                                } else {
                                                    const unmet = [];
                                                    if (week.completedPracticeCount < week.requiredPracticeCount) unmet.push(`Practice sets: ${week.completedPracticeCount}/${week.requiredPracticeCount}`);
                                                    if (week.avgScoreForWeek < week.requiredMinAvgScore) unmet.push(`Avg Score: ${week.avgScoreForWeek}% / ${week.requiredMinAvgScore}%`);
                                                    if (!week.tasks.every(t => t.done)) unmet.push("Checklist items incomplete");

                                                    if (unmet.length > 0) {
                                                        alert(`Incomplete Requirements:\n- ${unmet.join('\n- ')}`);
                                                    } else {
                                                        completeWeekMutation.mutate({ weekId: week.id });
                                                        setSelectedWeekNumber(null);
                                                    }
                                                }
                                            }}
                                        >
                                            {week.completed ? 'Reopen Week' : 'Verify & Complete'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    </div>
                );
            })()}
        </div>
    );
}
