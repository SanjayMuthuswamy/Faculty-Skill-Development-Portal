import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionPacksApi, QuestionOption, Question } from '../../lib/api/questionPacks';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { ChevronLeft, Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Difficulty } from '../../lib/api/tests';

export default function PackDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const { data: pack, isLoading } = useQuery({
        queryKey: ['questionPack', id],
        queryFn: () => questionPacksApi.getPack(id!),
        enabled: !!id,
    });

    const { register, handleSubmit, reset, setValue } = useForm<any>({
        defaultValues: {
            difficulty: Difficulty.INTERMEDIATE,
            correctOption: 'A'
        }
    });

    const addQuestionMutation = useMutation({
        mutationFn: (data: any) => questionPacksApi.addQuestion(id!, data),
        onSuccess: () => {
            addToast('Question added successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['questionPack', id] });
            setIsModalOpen(false);
            reset();
        },
    });

    const updateQuestionMutation = useMutation({
        mutationFn: (data: { questionId: string; updates: any }) =>
            questionPacksApi.updateQuestion(data.questionId, data.updates),
        onSuccess: () => {
            addToast('Question updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['questionPack', id] });
            setIsModalOpen(false);
            setEditingQuestion(null);
            reset();
        },
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: (questionId: string) => questionPacksApi.deleteQuestion(questionId),
        onSuccess: () => {
            addToast('Question removed from pack', 'success');
            queryClient.invalidateQueries({ queryKey: ['questionPack', id] });
        },
    });

    const onSubmit = (data: any) => {
        const formattedQuestion = {
            question_text: data.questionText,
            option_a: data.options.A,
            option_b: data.options.B,
            option_c: data.options.C,
            option_d: data.options.D,
            correct_option: data.correctOption as QuestionOption,
            explanation: data.explanation
        };

        if (editingQuestion) {
            updateQuestionMutation.mutate({ questionId: editingQuestion.id, updates: formattedQuestion });
        } else {
            addQuestionMutation.mutate(formattedQuestion);
        }
    };

    const handleEdit = (q: any) => {
        setEditingQuestion(q);
        setValue('questionText', q.question_text);
        setValue('options', { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d });
        setValue('correctOption', q.correct_option);
        setValue('explanation', q.explanation);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingQuestion(null);
        reset({
            questionText: '',
            options: { A: '', B: '', C: '', D: '' },
            correctOption: 'A',
            explanation: ''
        });
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading pack details...</div>;
    if (!pack) return <div className="p-8 text-center text-red-500">Pack not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/admin/question-packs')}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Packs
                </Button>
                <div className="flex gap-2">
                    <Button onClick={openCreateModal}>
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                </div>
            </div>

            <Card className="bg-blue-600 text-white border-none">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <Badge variant="outline" className="text-white border-white bg-white/10">{pack.domain}</Badge>
                            <CardTitle className="text-3xl font-bold">{pack.pack_name}</CardTitle>
                            <CardDescription className="text-blue-100 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {pack.topic} • {pack.difficulty} Difficulty
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-sm font-medium">Status</p>
                            <Badge className="bg-white text-blue-600 ml-auto mt-1">{pack.status}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-blue-50 max-w-2xl">{pack.description || 'No description provided for this pack.'}</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    Questions ({pack.questions.length})
                </h3>

                {pack.questions.length === 0 ? (
                    <Card className="p-12 text-center text-gray-400 border-dashed border-2">
                        <p>No questions in this pack yet.</p>
                        <Button variant="link" onClick={openCreateModal}>Click here to add the first one</Button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {pack.questions.map((q, idx) => (
                            <Card key={q.id} className="relative group">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-semibold text-gray-400">Question {idx + 1}</span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(q)}>
                                                <Edit2 className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteQuestionMutation.mutate(q.id)}>
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-base leading-snug">{q.question_text}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        {[
                                            { letter: 'A', text: q.option_a },
                                            { letter: 'B', text: q.option_b },
                                            { letter: 'C', text: q.option_c },
                                            { letter: 'D', text: q.option_d }
                                        ].map(({ letter, text }) => (
                                            <div
                                                key={letter}
                                                className={`p-2 rounded border text-sm flex items-center gap-2 ${q.correct_option === letter ? 'bg-green-50 border-green-200 text-green-900 font-medium' : 'bg-gray-50 border-gray-100'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${q.correct_option === letter ? 'bg-green-600 text-white border-transparent' : 'bg-white border-gray-300 text-gray-500'}`}>
                                                    {letter}
                                                </div>
                                                <span className="truncate">{text}</span>
                                                {q.correct_option === letter && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-green-600" />}
                                            </div>
                                        ))}
                                    </div>
                                    {q.explanation && (
                                        <div className="mt-4 p-3 bg-blue-50/50 text-blue-800 text-xs rounded border border-blue-100">
                                            <span className="font-bold">Explanation:</span> {q.explanation}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingQuestion ? "Edit Question" : "Add New Question"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Question Text</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="Enter the question..."
                            {...register('questionText', { required: true })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Option A" {...register('options.A', { required: true })} />
                        <Input label="Option B" {...register('options.B', { required: true })} />
                        <Input label="Option C" {...register('options.C', { required: true })} />
                        <Input label="Option D" {...register('options.D', { required: true })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Correct Option</label>
                            <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('correctOption')}>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Explanation</label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="Why is the selected option correct?"
                            {...register('explanation')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">
                            {editingQuestion ? "Update Question" : "Add Question"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
