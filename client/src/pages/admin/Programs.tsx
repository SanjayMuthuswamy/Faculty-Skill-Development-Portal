import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { programsApi, ProgramStatus, Program } from '../../lib/api/programs';
import { SkillDomain } from '../../lib/api/skills';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface ProgramFormData {
    title: string;
    description: string;
    domain: SkillDomain;
    startDate: string;
    endDate: string;
    seats: number | string;
    status: ProgramStatus;
    mode?: string;
    topics?: string;
    benefits?: string;
}

function splitCsv(input?: string): string[] {
    if (!input) return [];
    return input
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
}

function getApiErrorMessage(error: any, fallback: string): string {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const normalized = detail.map((d: any) => {
            if (typeof d === 'string') return d;
            if (d?.loc && d?.msg) return `${d.loc.join('.')}: ${d.msg}`;
            if (d?.msg) return d.msg;
            return String(d);
        });
        return normalized.join(', ');
    }
    return fallback;
}

export default function AdminPrograms() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);

    const { data: programs, isLoading } = useQuery({
        queryKey: ['programs'],
        queryFn: () => programsApi.listPrograms(),
    });

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProgramFormData>();

    const createMutation = useMutation({
        mutationFn: programsApi.createProgram,
        onSuccess: () => {
            addToast('Program created', 'success');
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            setIsModalOpen(false);
            reset();
        },
        onError: (error: any) => {
            const message = getApiErrorMessage(error, 'Failed to create program');
            addToast(message, 'error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string; updates: any }) => programsApi.updateProgram(data.id, data.updates),
        onSuccess: () => {
            addToast('Program updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            setIsModalOpen(false);
            setEditingProgram(null);
            reset();
        },
        onError: (error: any) => {
            const message = getApiErrorMessage(error, 'Failed to update program');
            addToast(message, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: programsApi.deleteProgram,
        onSuccess: () => {
            addToast('Program deleted', 'info');
            queryClient.invalidateQueries({ queryKey: ['programs'] });
        },
    });

    const onSubmit = (data: ProgramFormData) => {
        const topics = splitCsv(data.topics);
        const benefits = splitCsv(data.benefits);
        const status = data.status || ProgramStatus.DRAFT;

        if (status === ProgramStatus.PUBLISHED && topics.length === 0) {
            addToast('Add at least one topic before publishing a program.', 'error');
            return;
        }

        const formattedData = {
            title: data.title,
            description: data.description,
            domain: data.domain,
            start_date: data.startDate ? new Date(data.startDate).toISOString() : undefined,
            end_date: data.endDate ? new Date(data.endDate).toISOString() : undefined,
            seats: Number(data.seats) || 30,
            mode: data.mode || 'Online',
            topics,
            benefits,
            status
        };

        if (editingProgram) {
            updateMutation.mutate({ id: editingProgram.id, updates: formattedData });
        } else {
            createMutation.mutate(formattedData);
        }
    };

    const handleEdit = (program: any) => {
        setEditingProgram(program);
        setValue('title', program.title);
        setValue('description', program.description);
        setValue('domain', program.domain);
        setValue('startDate', program.start_date ? format(new Date(program.start_date), 'yyyy-MM-dd') : '');
        setValue('endDate', program.end_date ? format(new Date(program.end_date), 'yyyy-MM-dd') : '');
        setValue('seats', program.seats);
        setValue('status', program.status);
        setValue('mode', program.mode || 'Online');
        setValue('topics', Array.isArray(program.topics) ? program.topics.join(', ') : '');
        setValue('benefits', Array.isArray(program.benefits) ? program.benefits.join(', ') : '');
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingProgram(null);
        reset();
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Program Management</h1>
                    <p className="text-gray-500">Create and manage training programs</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Create Program
                </Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Enrolled</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                        ) : programs?.map((program) => (
                            <TableRow key={program.id}>
                                <TableCell className="font-medium">
                                    {program.title}
                                    <div className="text-xs text-gray-500 w-48 truncate">{program.description}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">{program.domain}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {program.start_date ? format(new Date(program.start_date), 'MMM d, yyyy') : 'TBD'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {program.enrollments?.length || 0} / {program.seats}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        program.status === ProgramStatus.DRAFT ? 'secondary' :
                                            [ProgramStatus.PUBLISHED, ProgramStatus.ONGOING].includes(program.status) ? 'success' : 'default'
                                    }>
                                        {program.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(program)}>
                                            <Edit2 className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(program.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProgram ? "Edit Program" : "Create New Program"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Program Title"
                        {...register('title', { required: 'Title is required' })}
                        error={errors.title?.message as string}
                    />

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className={cn(
                                "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600",
                                errors.description && "border-red-500 focus:ring-red-500/10"
                            )}
                            {...register('description', { required: 'Description is required' })}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-500">{errors.description.message as string}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Start Date"
                            type="date"
                            {...register('startDate', { required: 'Start date is required' })}
                            error={errors.startDate?.message as string}
                        />
                        <Input
                            label="End Date"
                            type="date"
                            {...register('endDate', { required: 'End date is required' })}
                            error={errors.endDate?.message as string}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Domain</label>
                            <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('domain')}>
                                {Object.values(SkillDomain).map(domain => (
                                    <option key={domain} value={domain}>{domain}</option>
                                ))}
                            </select>
                        </div>
                        <Input
                            label="Seats"
                            type="number"
                            {...register('seats', { required: 'Seats are required', min: { value: 1, message: 'At least 1 seat required' } })}
                            error={errors.seats?.message as string}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mode</label>
                        <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('mode')}>
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('status')}>
                            {Object.values(ProgramStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Topics (comma separated)</label>
                        <textarea
                            className="flex min-h-[72px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="e.g. Prompt Engineering, LLM Evaluation, API Integration"
                            {...register('topics')}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Benefits (comma separated)</label>
                        <textarea
                            className="flex min-h-[72px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="e.g. Certificate, Hands-on labs, Mentorship"
                            {...register('benefits')}
                        />
                    </div>



                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingProgram ? "Update Program" : "Create Program"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
