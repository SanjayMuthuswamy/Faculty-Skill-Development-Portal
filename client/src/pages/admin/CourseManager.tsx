import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, Course, CourseModule } from '../../lib/api/courses';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Eye, EyeOff, Loader2, X, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

type ModalMode = 'course' | 'module' | 'quiz' | 'assessment' | null;

interface ModalState {
    mode: ModalMode;
    courseId?: string;
    moduleId?: string;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function CourseManagerPage() {
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<ModalState>({ mode: null });
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});

    const { data: courses = [], isLoading } = useQuery({
        queryKey: ['admin-courses'],
        queryFn: () => coursesApi.listCourses(),
    });
    const { data: expandedCourseDetails, isFetching: isFetchingExpandedCourse } = useQuery({
        queryKey: ['admin-course-details', expandedCourse],
        queryFn: () => coursesApi.getCourse(expandedCourse as string),
        enabled: !!expandedCourse,
    });

    const createCourseMutation = useMutation({
        mutationFn: (data: any) => coursesApi.createCourse(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
            setModal({ mode: null });
        },
    });

    const updateCourseMutation = useMutation({
        mutationFn: ({ id, data }: any) => coursesApi.updateCourse(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
            setModal({ mode: null });
        },
    });

    const deleteCourseMutation = useMutation({
        mutationFn: (id: string) => coursesApi.deleteCourse(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
    });

    const addModuleMutation = useMutation({
        mutationFn: ({ courseId, data }: any) => coursesApi.addModule(courseId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
            setModal({ mode: null });
        },
    });

    const deleteModuleMutation = useMutation({
        mutationFn: ({ courseId, moduleId }: any) => coursesApi.deleteModule(courseId, moduleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
        },
    });

    const addQuizMutation = useMutation({
        mutationFn: ({ courseId, moduleId, data }: any) => coursesApi.addQuizQuestion(courseId, moduleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
            setModal({ mode: null });
        },
    });

    const addAssessmentMutation = useMutation({
        mutationFn: ({ courseId, data }: any) => coursesApi.addAssessmentQuestion(courseId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
            queryClient.invalidateQueries({ queryKey: ['admin-course-details'] });
            setModal({ mode: null });
        },
    });

    const openModal = (mode: ModalMode, partial?: Partial<ModalState>, initial?: Record<string, any>) => {
        setForm(initial ?? {});
        setModal({ mode, ...partial });
    };

    const normalizeTags = (rawTags: unknown): string[] => {
        if (Array.isArray(rawTags)) {
            return rawTags.map((tag) => String(tag).trim()).filter(Boolean);
        }
        if (typeof rawTags === 'string') {
            return rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
        }
        return [];
    };

    const normalizeDuration = (rawDuration: unknown): number | undefined => {
        if (rawDuration === '' || rawDuration === null || rawDuration === undefined) return undefined;
        const parsed = Number(rawDuration);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    const buildCoursePayload = () => {
        const payload: Record<string, any> = {
            title: (form.title || '').trim(),
            description: form.description || undefined,
            instructor_name: form.instructor_name || '',
            duration_hours: normalizeDuration(form.duration_hours),
            skill_level: form.skill_level || 'beginner',
            tags: normalizeTags(form.tags),
            thumbnail_url: form.thumbnail_url || undefined,
            is_published: !!form.is_published,
        };
        if (payload.duration_hours === undefined) delete payload.duration_hours;
        return payload;
    };

    const handleSubmit = () => {
        if (modal.mode === 'course') {
            const payload = buildCoursePayload();
            if (form.id) updateCourseMutation.mutate({ id: form.id, data: payload });
            else createCourseMutation.mutate(payload);
        } else if (modal.mode === 'module' && modal.courseId) {
            addModuleMutation.mutate({
                courseId: modal.courseId,
                data: { ...form, key_takeaways: (form.key_takeaways || '').split('\n').filter(Boolean), order_index: parseInt(form.order_index || '0') }
            });
        } else if (modal.mode === 'quiz' && modal.courseId && modal.moduleId) {
            addQuizMutation.mutate({
                courseId: modal.courseId, moduleId: modal.moduleId,
                data: { ...form, options: { A: form.optA, B: form.optB, C: form.optC, D: form.optD } }
            });
        } else if (modal.mode === 'assessment' && modal.courseId) {
            addAssessmentMutation.mutate({
                courseId: modal.courseId,
                data: { ...form, options: { A: form.optA, B: form.optB, C: form.optC, D: form.optD } }
            });
        }
    };

    if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Course Manager</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Create and manage courses, modules, quizzes, and assessments.</p>
                </div>
                <button
                    onClick={() => openModal('course')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    <Plus className="h-4 w-4" /> New Course
                </button>
            </div>

            {courses.length === 0 && (
                <div className="flex flex-col items-center py-16 text-slate-400">
                    <p className="font-medium">No courses yet.</p>
                    <p className="text-sm mt-1">Create your first course to get started.</p>
                </div>
            )}

            <div className="space-y-3">
                {courses.map((course: Course) => {
                    const isOpen = expandedCourse === course.id;
                    const modules = isOpen && expandedCourseDetails?.id === course.id ? expandedCourseDetails.modules : [];
                    const showModuleLoader = isOpen && isFetchingExpandedCourse && expandedCourseDetails?.id !== course.id;
                    return (
                        <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {/* Course Row */}
                            <div className="flex items-center gap-3 px-5 py-4">
                                <button onClick={() => setExpandedCourse(isOpen ? null : course.id)} className="flex-1 flex items-center gap-3 text-left">
                                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{course.title}</p>
                                        <p className="text-xs text-slate-400">{course.skill_level} · {course.instructor_name} · {course.module_count ?? 0} modules</p>
                                    </div>
                                </button>
                                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", course.is_published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                                    {course.is_published ? 'Published' : 'Draft'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => openModal('course', {}, { ...course, tags: (course.tags || []).join(', ') })}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                                        title="Edit"
                                    ><Edit2 className="h-3.5 w-3.5" /></button>
                                    <button
                                        onClick={() => updateCourseMutation.mutate({ id: course.id, data: { is_published: !course.is_published } })}
                                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                                        title={course.is_published ? 'Unpublish' : 'Publish'}
                                    >{course.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                                    <button
                                        onClick={() => { if (confirm('Delete this course?')) deleteCourseMutation.mutate(course.id); }}
                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                                        title="Delete"
                                    ><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>

                            {/* Modules Panel */}
                            {isOpen && (
                                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Modules</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => openModal('assessment', { courseId: course.id })} className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors">+ Assessment Q</button>
                                            <button onClick={() => openModal('module', { courseId: course.id })} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors">+ Module</button>
                                        </div>
                                    </div>
                                    {showModuleLoader && (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        </div>
                                    )}
                                    {modules.map((mod: CourseModule) => (
                                        <div key={mod.id} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">{mod.title}</p>
                                                <p className="text-xs text-slate-400">{mod.quiz_questions?.length ?? 0} quiz questions</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openModal('quiz', { courseId: course.id, moduleId: mod.id })} className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors">+ Quiz Q</button>
                                                <button
                                                    onClick={() => { if (confirm('Delete module?')) deleteModuleMutation.mutate({ courseId: course.id, moduleId: mod.id }); }}
                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                ><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {!showModuleLoader && !modules.length && (
                                        <p className="text-xs text-slate-400 text-center py-3">No modules yet. Add one above.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {modal.mode && (
                <Modal
                    title={
                        modal.mode === 'course' ? (form.id ? 'Edit Course' : 'Create Course') :
                            modal.mode === 'module' ? 'Add Module' :
                                modal.mode === 'quiz' ? 'Add Quiz Question' : 'Add Assessment Question'
                    }
                    onClose={() => setModal({ mode: null })}
                >
                    <div className="space-y-4">
                        {modal.mode === 'course' && (<>
                            <FieldGroup label="Title"><input className={inputCls} value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Course title" /></FieldGroup>
                            <FieldGroup label="Description"><textarea className={inputCls} rows={3} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Course description" /></FieldGroup>
                            <div className="grid grid-cols-2 gap-3">
                                <FieldGroup label="Instructor"><input className={inputCls} value={form.instructor_name || ''} onChange={e => setForm(p => ({ ...p, instructor_name: e.target.value }))} placeholder="Instructor name" /></FieldGroup>
                                <FieldGroup label="Duration (hours)"><input type="number" className={inputCls} value={form.duration_hours ?? ''} onChange={e => setForm(p => ({ ...p, duration_hours: e.target.value }))} placeholder="1.5" /></FieldGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FieldGroup label="Skill Level">
                                    <select className={inputCls} value={form.skill_level || 'beginner'} onChange={e => setForm(p => ({ ...p, skill_level: e.target.value }))}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </FieldGroup>
                                <FieldGroup label="Thumbnail URL"><input className={inputCls} value={form.thumbnail_url || ''} onChange={e => setForm(p => ({ ...p, thumbnail_url: e.target.value }))} placeholder="https://..." /></FieldGroup>
                            </div>
                            <FieldGroup label="Tags (comma-separated)"><input className={inputCls} value={form.tags || ''} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="AI, Teaching, Research" /></FieldGroup>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={form.is_published || false} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} className="rounded" />
                                Publish immediately
                            </label>
                        </>)}

                        {modal.mode === 'module' && (<>
                            <FieldGroup label="Module Title"><input className={inputCls} value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Module title" /></FieldGroup>
                            <FieldGroup label="Description"><textarea className={inputCls} rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this module covers" /></FieldGroup>
                            <FieldGroup label="Video URL (YouTube embed)"><input className={inputCls} value={form.video_url || ''} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://www.youtube.com/embed/..." /></FieldGroup>
                            <FieldGroup label="Notes / PDF URL"><input className={inputCls} value={form.notes_url || ''} onChange={e => setForm(p => ({ ...p, notes_url: e.target.value }))} placeholder="https://..." /></FieldGroup>
                            <FieldGroup label="Key Takeaways (one per line)"><textarea className={inputCls} rows={3} value={form.key_takeaways || ''} onChange={e => setForm(p => ({ ...p, key_takeaways: e.target.value }))} placeholder="Takeaway 1&#10;Takeaway 2" /></FieldGroup>
                            <FieldGroup label="Order Index"><input type="number" className={inputCls} value={form.order_index || 0} onChange={e => setForm(p => ({ ...p, order_index: e.target.value }))} /></FieldGroup>
                        </>)}

                        {(modal.mode === 'quiz' || modal.mode === 'assessment') && (<>
                            <FieldGroup label="Question"><textarea className={inputCls} rows={2} value={form.question_text || ''} onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))} placeholder="Question text…" /></FieldGroup>
                            {['A', 'B', 'C', 'D'].map(opt => (
                                <FieldGroup key={opt} label={`Option ${opt}`}>
                                    <input className={inputCls} value={form[`opt${opt}`] || ''} onChange={e => setForm(p => ({ ...p, [`opt${opt}`]: e.target.value }))} placeholder={`Option ${opt}`} />
                                </FieldGroup>
                            ))}
                            <FieldGroup label="Correct Answer">
                                <select className={inputCls} value={form.correct_answer || 'A'} onChange={e => setForm(p => ({ ...p, correct_answer: e.target.value }))}>
                                    {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </FieldGroup>
                            <FieldGroup label="Explanation (optional)"><input className={inputCls} value={form.explanation || ''} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} placeholder="Explain the correct answer" /></FieldGroup>
                        </>)}

                        <button
                            onClick={handleSubmit}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="h-4 w-4" /> Save
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
