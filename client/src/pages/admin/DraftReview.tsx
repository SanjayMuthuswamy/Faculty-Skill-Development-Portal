import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { aiQuestionsApi, QuestionDraft, QuestionDraftStatus } from '../../lib/api/aiQuestions';
import { questionPacksApi } from '../../lib/api/questionPacks';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Difficulty } from '../../lib/api/tests';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { CheckCircle2, XCircle, Edit3, Save, ArrowLeft, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { SkillDomain } from '../../lib/api/skills';

export default function DraftReview() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<QuestionDraft | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    // Publishing configuration state
    const [publishConfig, setPublishConfig] = useState<{
        domain: SkillDomain;
        packName: string;
        topic: string;
        difficulty: Difficulty;
        existingPackId?: string;
        description?: string;
    }>({
        domain: SkillDomain.TECHNOLOGY,
        packName: '',
        topic: '',
        difficulty: Difficulty.INTERMEDIATE,
    });

    const { data: draft, isLoading } = useQuery({
        queryKey: ['questionDrafts', id],
        queryFn: () => aiQuestionsApi.getBatch(id!),
        enabled: !!id,
    });

    const { data: packs } = useQuery({
        queryKey: ['questionPacks'],
        queryFn: () => questionPacksApi.listPacks(),
    });

    // Preset config when draft loads
    useMemo(() => {
        if (draft) {
            setPublishConfig(prev => ({
                ...prev,
                topic: draft.topic,
                difficulty: draft.difficulty as any || Difficulty.INTERMEDIATE
            }));
        }
    }, [draft]);

    const approveMutation = useMutation({
        mutationFn: (index: number) => aiQuestionsApi.approveQuestion(id!, index),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questionDrafts', id] });
            addToast('Question approved', 'success');
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (index: number) => aiQuestionsApi.rejectQuestion(id!, index),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questionDrafts', id] });
            addToast('Question rejected', 'info');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ index, data }: { index: number, data: Partial<QuestionDraft> }) =>
            aiQuestionsApi.updateQuestion(id!, index, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questionDrafts', id] });
            setEditingIndex(null);
            addToast('Question updated', 'success');
        }
    });

    const publishMutation = useMutation({
        mutationFn: () => aiQuestionsApi.publishToPack(id!, publishConfig),
        onSuccess: () => {
            addToast('Questions published to pack successfully', 'success');
            setIsPublishModalOpen(false);
            navigate('/admin/question-packs');
        },
        onError: (err: any) => {
            addToast(err.message || 'Failed to publish', 'destructive');
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading draft batch...</div>;
    if (!draft) return <div className="p-8 text-center text-red-500">Draft batch not found.</div>;

    const approvedCount = draft.questions.filter(q => q.draft_status === QuestionDraftStatus.APPROVED).length;
    const pendingCount = draft.questions.filter(q => q.draft_status === QuestionDraftStatus.PENDING).length;
    const isPublished = draft.status === 'published';

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditForm(JSON.parse(JSON.stringify(draft.questions[index])));
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingIndex !== null && editForm) {
            updateMutation.mutate({ index: editingIndex, data: editForm });
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/ai-questions')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Draft Review</h1>
                        <div className="text-gray-500 flex items-center gap-1">
                            Batch: <span className="font-medium text-gray-900">{draft.topic}</span> •
                            Status: <Badge className="ml-2 capitalize">{draft.status}</Badge>
                        </div>
                    </div>
                </div>
                {!isPublished && (
                    <Button
                        disabled={approvedCount === 0 || pendingCount > 0}
                        onClick={() => setIsPublishModalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 h-10 px-6"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Finish & Publish ({approvedCount})
                    </Button>
                )}
            </div>

            {pendingCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p>You have <strong>{pendingCount}</strong> pending questions. Please approve or reject each drafted question before publishing.</p>
                </div>
            )}

            <div className="grid gap-6">
                {draft.questions.map((q, idx) => (
                    <Card key={q.id} className={
                        q.draft_status === QuestionDraftStatus.APPROVED ? 'border-green-200 bg-green-50/30' :
                            q.draft_status === QuestionDraftStatus.REJECTED ? 'border-red-200 bg-red-50/30 grayscale opacity-70' : ''
                    }>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Q{idx + 1}</Badge>
                                        <Badge variant={
                                            q.draft_status === QuestionDraftStatus.APPROVED ? 'success' :
                                                q.draft_status === QuestionDraftStatus.REJECTED ? 'destructive' : 'secondary'
                                        } className="capitalize">
                                            {q.draft_status}
                                        </Badge>
                                    </div>
                                    <p className="text-lg font-medium text-gray-900 pt-2">{q.question_text}</p>
                                </div>
                                {!isPublished && (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(idx)}>
                                            <Edit3 className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-green-600 hover:bg-green-100"
                                            onClick={() => approveMutation.mutate(idx)}
                                            disabled={q.draft_status === QuestionDraftStatus.APPROVED}
                                        >
                                            <CheckCircle2 className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:bg-red-100"
                                            onClick={() => rejectMutation.mutate(idx)}
                                            disabled={q.draft_status === QuestionDraftStatus.REJECTED}
                                        >
                                            <XCircle className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                {[
                                    { id: 'A', text: q.option_a },
                                    { id: 'B', text: q.option_b },
                                    { id: 'C', text: q.option_c },
                                    { id: 'D', text: q.option_d }
                                ].map(({ id: letter, text }) => (
                                    <div key={letter} className={`flex items-center gap-3 p-2 rounded border text-sm ${letter === q.correct_option ? 'bg-green-100 border-green-200 text-green-900 font-semibold' : 'bg-white border-gray-200'}`}>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${letter === q.correct_option ? 'bg-green-600 text-white border-transparent' : 'border-gray-300 text-gray-500'}`}>
                                            {letter}
                                        </div>
                                        {text}
                                        {letter === q.correct_option && <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />}
                                    </div>
                                ))}
                            </div>
                            {q.explanation && (
                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                    <strong>Explanation:</strong> {q.explanation}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={editingIndex !== null}
                onClose={() => setEditingIndex(null)}
                title="Edit Draft Question"
            >
                {editForm && (
                    <form onSubmit={handleSaveEdit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Question Text</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                value={editForm.question_text}
                                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Options</label>
                            {[
                                { id: 'A', field: 'option_a' },
                                { id: 'B', field: 'option_b' },
                                { id: 'C', field: 'option_c' },
                                { id: 'D', field: 'option_d' }
                            ].map(({ id: letter, field }) => (
                                <div key={letter} className="flex gap-2 items-center">
                                    <div className="w-8 flex justify-center text-sm font-medium text-gray-500">{letter}</div>
                                    <Input
                                        value={(editForm as any)[field]}
                                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                                        className="flex-1"
                                    />
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={letter === editForm.correct_option}
                                        onChange={() => setEditForm({ ...editForm, correct_option: letter as any })}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Explanation</label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                                value={editForm.explanation || ''}
                                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => setEditingIndex(null)}>Cancel</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Publish Modal */}
            <Modal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                title="Publish to Question Pack"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3 text-blue-800 text-sm mb-4">
                        <Package className="h-5 w-5" />
                        <p>You are publishing <strong>{approvedCount}</strong> approved questions.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Domain</label>
                        <select
                            className="w-full h-10 rounded-md border border-gray-300 px-3 capitalize"
                            value={publishConfig.domain}
                            onChange={(e) => setPublishConfig({ ...publishConfig, domain: e.target.value as any })}
                        >
                            <option value={SkillDomain.TEACHING}>Teaching</option>
                            <option value={SkillDomain.RESEARCH}>Research</option>
                            <option value={SkillDomain.TECHNOLOGY}>Technology</option>
                            <option value={SkillDomain.LEADERSHIP}>Leadership</option>
                            <option value={SkillDomain.COMMUNICATION}>Communication</option>
                        </select>
                    </div>

                    <div className="space-y-3 border p-4 rounded-md bg-gray-50">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="packType"
                                checked={!!publishConfig.existingPackId}
                                onChange={() => setPublishConfig({ ...publishConfig, existingPackId: packs?.filter(p => p.domain === publishConfig.domain)[0]?.id || '' })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">Add to existing pack</span>
                        </label>

                        {publishConfig.existingPackId !== undefined && (
                            <select
                                className="w-full h-10 rounded-md border border-gray-300 px-3"
                                value={publishConfig.existingPackId}
                                onChange={(e) => setPublishConfig({ ...publishConfig, existingPackId: e.target.value })}
                            >
                                <option value="" disabled>Select a pack</option>
                                {packs?.filter(p => p.domain === publishConfig.domain).map(p => (
                                    <option key={p.id} value={p.id}>{p.pack_name} ({p.topic})</option>
                                ))}
                                {packs?.filter(p => p.domain === publishConfig.domain).length === 0 && (
                                    <option value="" disabled>No packs found for this domain</option>
                                )}
                            </select>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                            <input
                                type="radio"
                                name="packType"
                                checked={!publishConfig.existingPackId}
                                onChange={() => setPublishConfig({ ...publishConfig, existingPackId: undefined })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">Create new pack</span>
                        </label>

                        {!publishConfig.existingPackId && (
                            <div className="space-y-3 pt-2">
                                <Input
                                    label="Pack Name"
                                    placeholder="e.g. Advanced AI Concepts"
                                    value={publishConfig.packName}
                                    onChange={(e) => setPublishConfig({ ...publishConfig, packName: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Topic"
                                        value={publishConfig.topic}
                                        onChange={(e) => setPublishConfig({ ...publishConfig, topic: e.target.value })}
                                    />
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Difficulty</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-gray-300 px-3"
                                            value={publishConfig.difficulty}
                                            onChange={(e) => setPublishConfig({ ...publishConfig, difficulty: e.target.value as any })}
                                        >
                                            <option value={Difficulty.BEGINNER}>Beginner</option>
                                            <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                                            <option value={Difficulty.ADVANCED}>Advanced</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsPublishModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            disabled={publishMutation.isPending || (!publishConfig.existingPackId && !publishConfig.packName)}
                            onClick={() => publishMutation.mutate()}
                        >
                            {publishMutation.isPending ? 'Publishing...' : 'Confirm & Publish'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
