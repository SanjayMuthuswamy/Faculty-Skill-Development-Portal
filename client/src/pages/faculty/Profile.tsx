import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { facultyApi, SkillStatus } from '../../lib/api/faculty';
import { skillsApi, SkillDomain } from '../../lib/api/skills';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import {
    Mail,
    Briefcase,
    Calendar,
    Plus,
    Trash2,
    Edit2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { FacultySkill } from '../../lib/types';
import { cn } from '../../lib/utils';

export default function FacultyProfile() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<any | null>(null);

    const { data: profile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['faculty-profile', 'me'],
        queryFn: () => facultyApi.getMe(),
        enabled: !!user,
    });

    const skills = profile?.skills || [];

    const { register, handleSubmit, reset, setValue } = useForm<Omit<FacultySkill, 'id'>>();

    const addSkillMutation = useMutation({
        mutationFn: (data: { skill_name: string, domain: string, level: number }) => facultyApi.addSkill(data),
        onSuccess: () => {
            addToast('Skill added successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            setIsSkillModalOpen(false);
            reset();
        },
    });

    const updateSkillMutation = useMutation({
        mutationFn: (data: { id: string; updates: { level: number } }) =>
            // In a real app we might have a specific update skill endpoint or use a general one
            // For now, let's assume we use a general one if available or mock it
            Promise.resolve(),
        onSuccess: () => {
            addToast('Skill updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
            setIsSkillModalOpen(false);
            setEditingSkill(null);
            reset();
        },
    });

    const deleteSkillMutation = useMutation({
        mutationFn: (id: string) =>
            // Mock delete for now if not in API
            Promise.resolve(),
        onSuccess: () => {
            addToast('Skill removed', 'info');
            queryClient.invalidateQueries({ queryKey: ['faculty-profile', 'me'] });
        },
    });

    const onSubmit = (data: any) => {
        if (editingSkill) {
            updateSkillMutation.mutate({ id: editingSkill.id, updates: { level: parseInt(data.level) } });
        } else {
            addSkillMutation.mutate({
                skill_name: data.name,
                domain: data.category === 'technical' ? SkillDomain.TECHNOLOGY : SkillDomain.PEDAGOGY, // Simplified mapping
                level: parseInt(data.level)
            });
        }
    };

    const handleEdit = (skill: any) => {
        setEditingSkill(skill);
        setValue('name', skill.skill.name);
        // setValue('category', ...); // Map domain back if needed
        setValue('level', skill.level.toString() as any);
        setIsSkillModalOpen(true);
    };

    const handleOpenAdd = () => {
        setEditingSkill(null);
        reset();
        setIsSkillModalOpen(true);
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Profile & Skills</h1>

            <div className="grid gap-6 md:grid-cols-3">
                {/* User Details Card */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader className="text-center">
                        <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 mb-4">
                            {user.name.charAt(0)}
                        </div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>{user.designation}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <Briefcase className="h-4 w-4" />
                            <span>{profile?.department || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{profile?.experience_years || 0} Years Experience</span>
                        </div>
                        <Button variant="outline" className="w-full mt-4">Edit Profile</Button>
                    </CardContent>
                </Card>

                {/* Skills Table */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Skills Matrix</CardTitle>
                            <CardDescription>Manage your technical and pedagogical skills</CardDescription>
                        </div>
                        <Button onClick={handleOpenAdd} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Skill
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Skill Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Verification Progress</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skills?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No skills added yet. Add your skills to get recommendations.
                                        </TableCell>
                                    </TableRow>
                                ) : skills?.map((skill) => (
                                    <TableRow key={skill.id}>
                                        <TableCell className="font-medium">{skill.skill.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{skill.skill.domain}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                skill.level >= 4 ? 'default' :
                                                    skill.level >= 3 ? 'secondary' : 'outline'
                                            } className="capitalize">
                                                Level {skill.level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={skill.status === SkillStatus.VERIFIED ? 'success' : 'secondary'}
                                                className={cn(
                                                    "gap-1",
                                                    skill.status === SkillStatus.VERIFIED ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {skill.status === SkillStatus.VERIFIED ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                                {skill.status === SkillStatus.VERIFIED ? 'Verified' : 'Self-Declared'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {skill.status !== SkillStatus.VERIFIED ? (
                                                <span className="text-xs text-amber-600">Verification Pending</span>
                                            ) : (
                                                <span className="text-xs text-green-600">Verified</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(skill)}>
                                                    <Edit2 className="h-4 w-4 text-gray-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteSkillMutation.mutate(skill.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Modal isOpen={isSkillModalOpen} onClose={() => setIsSkillModalOpen(false)} title={editingSkill ? "Edit Skill" : "Add New Skill"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input label="Skill Name" {...register('name', { required: true })} placeholder="e.g. Python" />

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Category</label>
                        <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('category')}>
                            <option value="technical">Technical</option>
                            <option value="pedagogy">Pedagogy</option>
                            <option value="soft-skills">Soft Skills</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Proficiency Level (1-5)</label>
                        <select className="w-full h-10 rounded-md border border-gray-300 px-3" {...register('level')}>
                            <option value="1">1 - Beginner</option>
                            <option value="2">2 - Elementary</option>
                            <option value="3">3 - Intermediate</option>
                            <option value="4">4 - Advanced</option>
                            <option value="5">5 - Expert</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsSkillModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingSkill ? "Update" : "Add Skill"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
