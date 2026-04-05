import { type FormEventHandler, type ReactNode, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { facultyApi, FacultyAccountForm } from '../../lib/api/faculty';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../lib/api/error';
import { Plus, Search, KeyRound, Pencil, Trash2, UserCog } from 'lucide-react';

const facultyFormSchema = z.object({
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().trim().email('Valid email is required'),
    department: z.string().trim().min(2, 'Department is required'),
    designation: z.string().trim().min(2, 'Designation is required'),
    experience_years: z.coerce.number().min(0, 'Experience cannot be negative'),
    is_active: z.boolean(),
});

const createFacultySchema = facultyFormSchema.extend({
    password: z.string().min(6, 'Temporary password must be at least 6 characters'),
});

const resetPasswordSchema = z.object({
    new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FacultyFormValues = z.infer<typeof facultyFormSchema>;
type CreateFacultyValues = z.infer<typeof createFacultySchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const DEFAULT_CREATE_VALUES: CreateFacultyValues = {
    name: '',
    email: '',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    experience_years: 0,
    is_active: true,
    password: '',
};

export default function FacultyAccountsPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [editingFaculty, setEditingFaculty] = useState<any | null>(null);
    const [resetFaculty, setResetFaculty] = useState<any | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const debouncedSearch = useDebouncedValue(search, 300);
    const pageSize = 10;

    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'faculty', 'accounts', page, pageSize, debouncedSearch],
        queryFn: () => facultyApi.listProfilesPaginated({
            page,
            pageSize,
            search: debouncedSearch || undefined,
        }),
    });

    const facultyRows = data?.items ?? [];
    const totalPages = data?.total_pages ?? 1;
    const totalAccounts = data?.total ?? 0;
    const activeAccounts = useMemo(
        () => facultyRows.filter((faculty) => faculty.user?.is_active !== false).length,
        [facultyRows],
    );

    const createForm = useForm<CreateFacultyValues>({
        resolver: zodResolver(createFacultySchema),
        defaultValues: DEFAULT_CREATE_VALUES,
    });

    const editForm = useForm<FacultyFormValues>({
        resolver: zodResolver(facultyFormSchema),
        defaultValues: {
            name: '',
            email: '',
            department: '',
            designation: '',
            experience_years: 0,
            is_active: true,
        },
    });

    const resetForm = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { new_password: '' },
    });

    const refreshAccounts = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'faculty', 'accounts'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'faculty', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dept-summary'] });
    };

    const createMutation = useMutation({
        mutationFn: (values: CreateFacultyValues) => facultyApi.createFacultyAccount(values),
        onSuccess: () => {
            addToast('Faculty account created successfully.', 'success');
            setCreateOpen(false);
            createForm.reset(DEFAULT_CREATE_VALUES);
            refreshAccounts();
        },
        onError: (error) => addToast(getApiErrorMessage(error, 'Failed to create faculty account.'), 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ facultyId, values }: { facultyId: string; values: FacultyAccountForm }) =>
            facultyApi.updateFacultyAccount(facultyId, values),
        onSuccess: () => {
            addToast('Faculty account updated.', 'success');
            setEditingFaculty(null);
            refreshAccounts();
        },
        onError: (error) => addToast(getApiErrorMessage(error, 'Failed to update faculty account.'), 'error'),
    });

    const resetMutation = useMutation({
        mutationFn: ({ facultyId, password }: { facultyId: string; password: string }) =>
            facultyApi.resetFacultyPassword(facultyId, password),
        onSuccess: () => {
            addToast('Faculty password reset successfully.', 'success');
            setResetFaculty(null);
            resetForm.reset({ new_password: '' });
        },
        onError: (error) => addToast(getApiErrorMessage(error, 'Failed to reset password.'), 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (facultyId: string) => facultyApi.deleteFacultyAccount(facultyId),
        onSuccess: () => {
            addToast('Faculty account deleted.', 'success');
            refreshAccounts();
        },
        onError: (error) => addToast(getApiErrorMessage(error, 'Failed to delete faculty account.'), 'error'),
    });

    const openEditModal = (faculty: any) => {
        setEditingFaculty(faculty);
        editForm.reset({
            name: faculty.user?.name || '',
            email: faculty.user?.email || '',
            department: faculty.department || '',
            designation: faculty.designation || '',
            experience_years: faculty.experience_years || 0,
            is_active: faculty.user?.is_active !== false,
        });
    };

    const openResetModal = (faculty: any) => {
        setResetFaculty(faculty);
        resetForm.reset({ new_password: '' });
    };

    const handleDelete = (faculty: any) => {
        const confirmed = window.confirm(`Delete faculty account for ${faculty.user?.name || 'this user'}? This cannot be undone.`);
        if (confirmed) {
            deleteMutation.mutate(faculty.id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Faculty Account Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Create, search, edit, reset, and remove faculty access from one place.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Faculty Account
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Total Accounts" value={totalAccounts} helper="Faculty records in the system" />
                <SummaryCard label="Visible Page" value={facultyRows.length} helper="Records in current search result" />
                <SummaryCard label="Active on Page" value={activeAccounts} helper="Currently active faculty accounts" />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by name, email, department, or designation"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Faculty ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">Loading faculty accounts...</TableCell>
                            </TableRow>
                        ) : facultyRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">No faculty accounts found for the current search.</TableCell>
                            </TableRow>
                        ) : facultyRows.map((faculty) => (
                            <TableRow key={faculty.id} className="hover:bg-slate-50/70">
                                <TableCell className="font-mono text-xs text-slate-500">{faculty.id.slice(0, 8)}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-semibold text-slate-900">{faculty.user?.name || 'Unknown'}</p>
                                        <p className="text-xs text-slate-500">{faculty.designation || 'Faculty'}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-600">{faculty.user?.email}</TableCell>
                                <TableCell>{faculty.department || 'Unassigned'}</TableCell>
                                <TableCell>
                                    <Badge className="border-none bg-blue-50 text-blue-700">FACULTY</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={faculty.user?.is_active === false ? 'border-none bg-rose-50 text-rose-700' : 'border-none bg-emerald-50 text-emerald-700'}>
                                        {faculty.user?.is_active === false ? 'Inactive' : 'Active'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditModal(faculty)} className="gap-1.5">
                                            <Pencil className="h-3.5 w-3.5" /> Edit
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => openResetModal(faculty)} className="gap-1.5">
                                            <KeyRound className="h-3.5 w-3.5" /> Reset Password
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(faculty)} className="gap-1.5">
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="pt-0" />
            )}

            <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Faculty Account">
                <FacultyForm
                    submitLabel="Create Account"
                    form={createForm}
                    onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                    isSubmitting={createMutation.isPending}
                    includePassword
                />
            </Modal>

            <Modal isOpen={Boolean(editingFaculty)} onClose={() => setEditingFaculty(null)} title="Edit Faculty Account">
                <FacultyForm
                    submitLabel="Save Changes"
                    form={editForm}
                    onSubmit={editForm.handleSubmit((values) => {
                        if (!editingFaculty) return;
                        updateMutation.mutate({ facultyId: editingFaculty.id, values });
                    })}
                    isSubmitting={updateMutation.isPending}
                />
            </Modal>

            <Modal isOpen={Boolean(resetFaculty)} onClose={() => setResetFaculty(null)} title="Reset Faculty Password" size="sm">
                <form
                    onSubmit={resetForm.handleSubmit((values) => {
                        if (!resetFaculty) return;
                        resetMutation.mutate({ facultyId: resetFaculty.id, password: values.new_password });
                    })}
                    className="space-y-4"
                >
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">{resetFaculty?.user?.name}</p>
                        <p className="mt-1">Set a new temporary password for {resetFaculty?.user?.email}.</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">New Password</label>
                        <input
                            type="password"
                            {...resetForm.register('new_password')}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />
                        {resetForm.formState.errors.new_password && (
                            <p className="text-xs text-rose-500">{resetForm.formState.errors.new_password.message}</p>
                        )}
                    </div>
                    <Button type="submit" isLoading={resetMutation.isPending} className="w-full">
                        Reset Password
                    </Button>
                </form>
            </Modal>
        </div>
    );
}

function SummaryCard({ label, value, helper }: { label: string; value: number; helper: string }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
            <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
    );
}

function FacultyForm({
    form,
    onSubmit,
    submitLabel,
    isSubmitting,
    includePassword = false,
}: {
    form: ReturnType<typeof useForm<any>>;
    onSubmit: FormEventHandler<HTMLFormElement>;
    submitLabel: string;
    isSubmitting: boolean;
    includePassword?: boolean;
}) {
    const errors = form.formState.errors;

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" error={errors.name?.message as string | undefined}>
                    <input {...form.register('name')} className={fieldClassName} />
                </Field>
                <Field label="Email" error={errors.email?.message as string | undefined}>
                    <input {...form.register('email')} type="email" className={fieldClassName} />
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Department" error={errors.department?.message as string | undefined}>
                    <input {...form.register('department')} className={fieldClassName} />
                </Field>
                <Field label="Designation" error={errors.designation?.message as string | undefined}>
                    <input {...form.register('designation')} className={fieldClassName} />
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Experience (Years)" error={errors.experience_years?.message as string | undefined}>
                    <input {...form.register('experience_years')} type="number" min={0} className={fieldClassName} />
                </Field>
                {includePassword ? (
                    <Field label="Temporary Password" error={errors.password?.message as string | undefined}>
                        <input {...form.register('password')} type="password" className={fieldClassName} />
                    </Field>
                ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Update faculty details and status here. Password resets are handled separately.
                    </div>
                )}
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input type="checkbox" {...form.register('is_active')} className="h-4 w-4 rounded border-slate-300" />
                Keep this faculty account active
            </label>
            <Button type="submit" isLoading={isSubmitting} className="w-full gap-2">
                <UserCog className="h-4 w-4" /> {submitLabel}
            </Button>
        </form>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">{label}</label>
            {children}
            {error ? <p className="text-xs text-rose-500">{error}</p> : null}
        </div>
    );
}

const fieldClassName = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50';
