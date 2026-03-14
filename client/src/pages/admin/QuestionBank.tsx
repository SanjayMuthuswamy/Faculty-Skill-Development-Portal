import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionPacksApi, QuestionOption, Question } from '../../lib/api/questionPacks';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';

export default function AdminQuestionBank() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const ITEMS_PER_PAGE = 10;

    const { data: questionsData, isLoading } = useQuery({
        queryKey: ['admin-global-questions', currentPage, ITEMS_PER_PAGE, debouncedSearchTerm],
        queryFn: () => questionPacksApi.listAllQuestionsPaginated({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            search: debouncedSearchTerm || undefined,
        }),
    });

    const { data: packs } = useQuery({
        queryKey: ['admin-question-packs'],
        queryFn: () => questionPacksApi.listPacks(),
    });

    const { register, handleSubmit, reset, setValue } = useForm<any>({
        defaultValues: {
            options: ['', '', '', ''],
            correctOptionIndex: 0
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => questionPacksApi.addQuestion(data.packId, data.question),
        onSuccess: () => {
            addToast('Question created', 'success');
            queryClient.invalidateQueries({ queryKey: ['admin-global-questions'] });
            setIsModalOpen(false);
            reset();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: any }) => questionPacksApi.updateQuestion(data.id, data.updates),
        onSuccess: () => {
            addToast('Question updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['admin-global-questions'] });
            setIsModalOpen(false);
            setEditingQuestion(null);
            reset();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: questionPacksApi.deleteQuestion,
        onSuccess: () => {
            addToast('Question deleted', 'info');
            queryClient.invalidateQueries({ queryKey: ['admin-global-questions'] });
        },
    });

    const onSubmit = (data: any) => {
        const optionKeys = ['A', 'B', 'C', 'D'];
        const formattedQuestion = {
            question_text: data.text,
            option_a: data.options[0],
            option_b: data.options[1],
            option_c: data.options[2],
            option_d: data.options[3],
            correct_option: optionKeys[Number(data.correctOptionIndex)] as QuestionOption,
            explanation: data.explanation
        };

        if (editingQuestion) {
            updateMutation.mutate({ id: editingQuestion.id, updates: formattedQuestion });
        } else {
            createMutation.mutate({ packId: data.packId, question: formattedQuestion });
        }
    };

    const handleEdit = (question: any) => {
        setEditingQuestion(question);
        const optionKeys = ['A', 'B', 'C', 'D'];
        setValue('text', question.question_text);
        setValue('options', [question.option_a, question.option_b, question.option_c, question.option_d]);
        setValue('correctOptionIndex', optionKeys.indexOf(question.correct_option));
        setValue('explanation', question.explanation);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingQuestion(null);
        reset({
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            text: '',
            explanation: '',
            packId: packs?.[0]?.id || ''
        });
        setIsModalOpen(true);
    };

    const filteredQuestions = questionsData?.items ?? [];
    const totalPages = questionsData?.total_pages ?? 1;
    const pagedQuestions = filteredQuestions;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                    <p className="text-gray-500">Manage MCQ questions for tests</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        className="w-full pl-9 h-9 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                {/* <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button> */}
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <div>Loading...</div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                        No questions found. Add some questions to get started.
                    </div>
                ) : pagedQuestions.map((question) => (
                    <Card key={question.id}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex gap-2 items-center">
                                        <Badge variant="outline">Pack Item</Badge>
                                    </div>
                                    <CardDescription className="text-base font-medium text-gray-900 mt-1">
                                        {question.question_text}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(question)}>
                                        <Edit2 className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(question.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                {[question.option_a, question.option_b, question.option_c, question.option_d].map((opt, i) => {
                                    const optionKeys = ['A', 'B', 'C', 'D'];
                                    const isCorrect = question.correct_option === optionKeys[i];
                                    return (
                                        <div key={i} className={`flex items-center gap-2 ${isCorrect ? 'text-green-600 font-medium' : ''}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${isCorrect ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                                                {optionKeys[i]}
                                            </div>
                                            {opt}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingQuestion ? "Edit Question" : "Add New Question"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
                    <div className="space-y-1">
                        <Input label="Question Text" {...register('text', { required: true })} />
                    </div>

                    {!editingQuestion && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Question Pack</label>
                            <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('packId', { required: true })}>
                                {packs?.map(pack => (
                                    <option key={pack.id} value={pack.id}>{pack.pack_name} ({pack.domain})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Options</label>
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <div className="w-8 flex justify-center text-sm font-medium text-gray-500">{String.fromCharCode(65 + index)}</div>
                                <Input
                                    {...register(`options.${index}` as any, { required: true })}
                                    className="flex-1"
                                    placeholder={`Option ${index + 1}`}
                                />
                                <input
                                    type="radio"
                                    value={index}
                                    {...register('correctOptionIndex', { required: true })}
                                    className="w-4 h-4 text-blue-600"
                                />
                            </div>
                        ))}
                        <p className="text-xs text-gray-500 text-right">Select the radio button for the correct answer</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Explanation (Optional)</label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="Why is this the correct answer?"
                            {...register('explanation')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingQuestion ? "Update Question" : "Add Question"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
