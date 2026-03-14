import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionPacksApi, PackStatus } from '../../lib/api/questionPacks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { Plus, Search, Filter, Package, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkillDomain } from '../../lib/api/skills';
import { Difficulty } from '../../lib/api/tests';
import { AddNewItemModal, SelectWithAddNew } from '../../components/shared/AddNewItemModal';
import { Pagination } from '../../components/ui/Pagination';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';

export default function AdminQuestionPacks() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [domainFilter, setDomainFilter] = useState<SkillDomain | 'ALL'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
    const ITEMS_PER_PAGE = 9;

    // Centralized topics (this should come from an API in a real app)
    const [topics, setTopics] = useState(['Machine Learning', 'Deep Learning', 'Neural Networks', 'Python Basics']);

    const { data: packsData, isLoading } = useQuery({
        queryKey: ['questionPacks', currentPage, ITEMS_PER_PAGE, debouncedSearchQuery, domainFilter],
        queryFn: () => questionPacksApi.listPacksPaginated({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            search: debouncedSearchQuery || undefined,
            domain: domainFilter !== 'ALL' ? domainFilter : undefined,
        }),
    });

    const filteredPacks = packsData?.items ?? [];
    const totalPages = packsData?.total_pages ?? 1;

    const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
        defaultValues: {
            domain: SkillDomain.TECHNOLOGY,
            difficulty: Difficulty.INTERMEDIATE,
            topic: 'Machine Learning'
        }
    });

    const currentTopic = watch('topic');

    const createMutation = useMutation({
        mutationFn: (data: any) => questionPacksApi.createPack({
            pack_name: data.packName,
            domain: data.domain,
            topic: data.topic,
            difficulty: data.difficulty,
            description: data.description,
            status: PackStatus.DRAFT
        }),
        onSuccess: () => {
            addToast('Question pack created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['questionPacks'] });
            setIsCreateModalOpen(false);
            reset();
        },
    });

    const onSubmit = (data: any) => {
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Question Packs</h1>
                    <p className="text-gray-500">Manage curated collections of questions organized by domain and topic</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Pack
                </Button>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search packs or topics..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <select
                                className="h-10 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-40"
                                value={domainFilter}
                                onChange={(e) => {
                                    setDomainFilter(e.target.value as any);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="ALL">All Domains</option>
                                <option value={SkillDomain.TEACHING}>Teaching</option>
                                <option value={SkillDomain.RESEARCH}>Research</option>
                                <option value={SkillDomain.TECHNOLOGY}>Technology</option>
                                <option value={SkillDomain.LEADERSHIP}>Leadership</option>
                                <option value={SkillDomain.COMMUNICATION}>Communication</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <p className="text-gray-500">Loading question packs...</p>
                </div>
            ) : filteredPacks.length === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No question packs found. Create one to get started.</p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPacks.map((pack) => (
                        <Card key={pack.id} className="group hover:border-blue-400 transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline">{pack.domain}</Badge>
                                    <Badge variant={
                                        pack.difficulty === Difficulty.BEGINNER ? 'success' :
                                            pack.difficulty === Difficulty.INTERMEDIATE ? 'warning' : 'destructive'
                                    }>
                                        {pack.difficulty}
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4 text-xl group-hover:text-blue-600 transition-colors">
                                    {pack.pack_name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    {pack.topic}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                                        {pack.description || 'No description provided.'}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                                        <div className="flex items-center gap-1">
                                            <Layers className="h-3.5 w-3.5" />
                                            <span>{pack.questions.length} Questions</span>
                                        </div>
                                        <span>Status: <span className={pack.status === 'PUBLISHED' ? 'text-green-600 font-medium' : 'text-amber-600'}>{pack.status}</span></span>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="px-6 py-4 border-t bg-gray-50/50 rounded-b-lg">
                                <Button
                                    className="w-full"
                                    variant="ghost"
                                    onClick={() => navigate(`/admin/question-packs/${pack.id}`)}
                                >
                                    Manage Pack <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="pt-0"
                />
            )}

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Question Pack">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Pack Name"
                        placeholder="e.g. AI Fundamentals"
                        {...register('packName', { required: true })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Domain</label>
                            <select
                                className="w-full h-10 rounded-md border border-gray-300 px-3 capitalize"
                                {...register('domain', { required: true })}
                            >
                                <option value={SkillDomain.TEACHING}>Teaching</option>
                                <option value={SkillDomain.RESEARCH}>Research</option>
                                <option value={SkillDomain.TECHNOLOGY}>Technology</option>
                                <option value={SkillDomain.LEADERSHIP}>Leadership</option>
                                <option value={SkillDomain.COMMUNICATION}>Communication</option>
                            </select>
                        </div>
                        <SelectWithAddNew
                            label="Topic"
                            options={topics}
                            value={currentTopic}
                            onChange={(val) => {
                                setValue('topic', val);
                            }}
                            onAddNew={() => setIsAddTopicModalOpen(true)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Difficulty</label>
                        <select
                            className="w-full h-10 rounded-md border border-gray-300 px-3"
                            {...register('difficulty', { required: true })}
                        >
                            <option value={Difficulty.BEGINNER}>Beginner</option>
                            <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                            <option value={Difficulty.ADVANCED}>Advanced</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="Describe what this pack covers..."
                            {...register('description')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create Pack'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal for adding new topic */}
            <AddNewItemModal
                isOpen={isAddTopicModalOpen}
                onClose={() => setIsAddTopicModalOpen(false)}
                title="Add New Topic"
                placeholder="e.g. Generative AI"
                description="Create a new topic to better organize your question packs."
                onAdd={async (name) => {
                    setTopics(prev => [...prev, name]);
                    // @ts-ignore - manual set for hook form
                    setValue('topic', name);
                    addToast(`Topic "${name}" added`, 'success');
                }}
            />
        </div>
    );
}
