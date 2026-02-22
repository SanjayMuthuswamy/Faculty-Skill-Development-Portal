import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testsApi, Difficulty, Test } from '../../lib/api/tests';
import { questionPacksApi, QuestionPack } from '../../lib/api/questionPacks';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm, useWatch } from 'react-hook-form';
import { Plus, CheckSquare, Square, ChevronRight, ChevronDown } from 'lucide-react';
import { SkillDomain } from '../../lib/api/skills';

export default function AdminTestBuilder() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<Test | null>(null);
    const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [expandedPacks, setExpandedPacks] = useState<string[]>([]);

    const { data: tests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['tests'],
        queryFn: () => testsApi.listTests(),
    });

    const { data: packs } = useQuery({
        queryKey: ['questionPacks'],
        queryFn: () => questionPacksApi.listPacks(),
    });

    const { register, handleSubmit, reset, setValue, control } = useForm<any>({
        defaultValues: {
            domain: SkillDomain.TECHNOLOGY,
            difficulty: Difficulty.INTERMEDIATE,
            durationMinutes: 30,
            passScore: 70
        }
    });

    const selectedDomain = useWatch({ control, name: 'domain' });

    const filteredPacks = useMemo(() => {
        if (!packs) return [];
        return packs.filter(p => p.domain === selectedDomain);
    }, [packs, selectedDomain]);

    const totalQuestionsSelected = useMemo(() => {
        let count = 0;
        // Count questions from full packs
        selectedPackIds.forEach(pid => {
            const pack = packs?.find(p => p.id === pid);
            if (pack) count += pack.questions.length;
        });
        // Add individual questions (not already in selected packs)
        selectedQuestionIds.forEach(qid => {
            // Check if this qid is already covered by a selected pack
            const isAlreadyCovered = selectedPackIds.some(pid =>
                packs?.find(p => p.id === pid)?.questions.some(q => q.id === qid)
            );
            if (!isAlreadyCovered) count++;
        });
        return count;
    }, [selectedPackIds, selectedQuestionIds, packs]);

    const createMutation = useMutation({
        mutationFn: (data: any) => testsApi.createTest(data),
        onSuccess: () => {
            addToast('Test created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            setIsModalOpen(false);
            reset();
            setSelectedPackIds([]);
            setSelectedQuestionIds([]);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: any }) => testsApi.updateTest(data.id, data.updates),
        onSuccess: () => {
            addToast('Test updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            setIsModalOpen(false);
            setEditingTest(null);
            reset();
            setSelectedPackIds([]);
            setSelectedQuestionIds([]);
        },
    });

    const onSubmit = (data: any) => {
        if (totalQuestionsSelected === 0) {
            addToast('Please select at least one pack or question', 'error');
            return;
        }

        const formattedData = {
            title: data.title,
            domain: data.domain,
            difficulty: data.difficulty,
            time_limit_minutes: Number(data.durationMinutes),
            pass_marks: Number(data.passScore),
            pack_ids: selectedPackIds,
            question_ids: selectedQuestionIds,
        };

        if (editingTest) {
            updateMutation.mutate({ id: editingTest.id, updates: formattedData });
        } else {
            createMutation.mutate(formattedData);
        }
    };

    const handleEdit = (test: any) => {
        setEditingTest(test);
        setValue('title', test.title);
        setValue('description', test.description);
        setValue('domain', test.domain);
        setValue('durationMinutes', test.time_limit_minutes);
        setValue('passScore', test.pass_marks);
        setValue('difficulty', test.difficulty);
        // Pack and question IDs might not be directly in the test list response
        // In a real app we might fetch the test detail first
        setSelectedPackIds(test.pack_ids || []);
        setSelectedQuestionIds(test.question_ids || []);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingTest(null);
        reset();
        setSelectedPackIds([]);
        setSelectedQuestionIds([]);
        setIsModalOpen(true);
    };

    const togglePackSelection = (pack: QuestionPack) => {
        const packId = pack.id;
        setSelectedPackIds(prev => {
            const isSelected = prev.includes(packId);
            if (isSelected) {
                return prev.filter(id => id !== packId);
            } else {
                // If selecting a pack, remove its individual questions if they were selected
                const qIdsInPack = pack.questions.map(q => q.id);
                setSelectedQuestionIds(qPrev => qPrev.filter(id => !qIdsInPack.includes(id)));
                return [...prev, packId];
            }
        });
    };

    const toggleQuestionSelection = (questionId: string, packId: string) => {
        // If the pack itself is selected, do nothing or de-select the pack
        if (selectedPackIds.includes(packId)) {
            setSelectedPackIds(prev => prev.filter(id => id !== packId));
            // Add all OTHER questions from that pack to individual selection
            const pack = packs?.find(p => p.id === packId);
            if (pack) {
                const otherQIds = pack.questions.filter(q => q.id !== questionId).map(q => q.id);
                setSelectedQuestionIds(prev => [...prev, ...otherQIds]);
            }
            return;
        }

        setSelectedQuestionIds(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const togglePackExpand = (packId: string) => {
        setExpandedPacks(prev =>
            prev.includes(packId)
                ? prev.filter(id => id !== packId)
                : [...prev, packId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Test Builder</h1>
                    <p className="text-gray-500">Create and manage skill assessments using Question Packs</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Create Test
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoadingTests ? (
                    <div>Loading...</div>
                ) : tests?.map((test) => (
                    <Card key={test.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge variant="outline">{test.domain}</Badge>
                                <Badge variant={
                                    test.difficulty === Difficulty.BEGINNER ? 'success' :
                                        test.difficulty === Difficulty.INTERMEDIATE ? 'warning' :
                                            test.difficulty === Difficulty.ADVANCED ? 'destructive' : 'secondary'
                                }>
                                    {test.difficulty}
                                </Badge>
                            </div>
                            <CardTitle className="mt-2">{test.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>Duration: {test.time_limit_minutes} mins</p>
                                <p>Pass Score: {test.pass_marks}%</p>
                                <p>Total Questions: {test.total_questions}</p>
                            </div>
                        </CardContent>
                        <div className="p-6 pt-0 flex justify-end gap-2 border-t mt-4">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(test)}>Edit</Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTest ? "Edit Test" : "Create New Test"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[85vh] overflow-y-auto px-1 custom-scrollbar">
                    <Input label="Test Title" {...register('title', { required: true })} />

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            {...register('description')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Domain</label>
                            <select className="w-full h-10 rounded-md border border-gray-300 px-3 capitalize" {...register('domain')}>
                                <option value={SkillDomain.TEACHING}>Teaching</option>
                                <option value={SkillDomain.RESEARCH}>Research</option>
                                <option value={SkillDomain.TECHNOLOGY}>Technology</option>
                                <option value={SkillDomain.LEADERSHIP}>Leadership</option>
                                <option value={SkillDomain.COMMUNICATION}>Communication</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Difficulty</label>
                            <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('difficulty')}>
                                <option value={Difficulty.BEGINNER}>Beginner</option>
                                <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                                <option value={Difficulty.ADVANCED}>Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Duration (Minutes)" type="number" {...register('durationMinutes', { required: true })} />
                        <Input label="Pass Score (%)" type="number" {...register('passScore', { required: true })} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex justify-between">
                            Select Content ({totalQuestionsSelected} questions)
                            <span className="text-xs text-gray-500">Filtered by {selectedDomain}</span>
                        </label>
                        <div className="max-h-80 overflow-y-auto border rounded-md divide-y custom-scrollbar">
                            {filteredPacks.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No published packs found for {selectedDomain}
                                </div>
                            ) : filteredPacks.map((pack) => (
                                <div key={pack.id} className="flex flex-col">
                                    <div className="p-3 flex items-center justify-between hover:bg-gray-50 bg-white sticky top-0 z-10">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="cursor-pointer text-gray-400 hover:text-gray-600"
                                                onClick={() => togglePackExpand(pack.id)}
                                            >
                                                {expandedPacks.includes(pack.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </div>
                                            <div
                                                className="flex items-center gap-2 cursor-pointer"
                                                onClick={() => togglePackSelection(pack)}
                                            >
                                                {selectedPackIds.includes(pack.id) ? (
                                                    <CheckSquare className="h-4 w-4 text-blue-600" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-gray-400" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{pack.pack_name}</p>
                                                    <p className="text-xs text-gray-500">{pack.questions.length} Questions • {pack.topic}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] h-5">{pack.difficulty}</Badge>
                                    </div>

                                    {expandedPacks.includes(pack.id) && (
                                        <div className="bg-gray-50/50 pl-11 pr-3 py-2 space-y-1 border-t border-gray-100">
                                            {pack.questions.map((q) => {
                                                const isPackSelected = selectedPackIds.includes(pack.id);
                                                const isQuestionSelected = selectedQuestionIds.includes(q.id);

                                                return (
                                                    <div
                                                        key={q.id}
                                                        className={`flex items - start gap - 2 p - 2 rounded - md transition - colors ${isPackSelected ? 'opacity-60 grayscale-[0.5]' : 'hover:bg-white cursor-pointer'} `}
                                                        onClick={() => !isPackSelected && toggleQuestionSelection(q.id, pack.id)}
                                                    >
                                                        {(isPackSelected || isQuestionSelected) ? (
                                                            <CheckSquare className="h-3.5 w-3.5 text-blue-600 mt-1 shrink-0" />
                                                        ) : (
                                                            <Square className="h-3.5 w-3.5 text-gray-300 mt-1 shrink-0" />
                                                        )}
                                                        <p className="text-xs text-gray-700 line-clamp-1">{q.question_text}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t sticky bottom-0 bg-white">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingTest ? "Update Test" : "Create Test"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
