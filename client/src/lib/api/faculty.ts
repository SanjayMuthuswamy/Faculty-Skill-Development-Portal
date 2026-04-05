import http from './http'

export enum SkillStatus {
    VERIFIED = "VERIFIED",
    UNVERIFIED = "UNVERIFIED",
    PENDING = "PENDING",
}

export interface FacultySkill {
    id: string;
    faculty_id: string;
    skill_id: string;
    level: number;
    status: SkillStatus;
    updated_at: string;
    skill: {
        id: string;
        name: string;
        domain: string;
    };
}

export interface CourseEnrollment {
    id: string;
    faculty_id: string;
    course_id: string;
    enrolled_at: string;
    completed_at?: string;
    progress: number;
    certificate_issued: boolean;
    course?: {
        id: string;
        title: string;
        description?: string;
        instructor_name: string;
        thumbnail_url?: string;
    };
}

export interface FacultyProfile {
    id: string;
    user_id: string;
    department?: string;
    designation?: string;
    experience_years?: number;
    profile_image_url?: string;
    enrollment_count?: number;
    created_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        is_active: boolean;
    };
    skills?: FacultySkill[];
    course_enrollments?: CourseEnrollment[];
}

export interface FacultyProfileUpdate {
    department?: string;
    designation?: string;
    experience_years?: number;
}

export interface FacultyAccountForm {
    name: string;
    email: string;
    department: string;
    designation: string;
    experience_years: number;
    is_active: boolean;
}

export interface PaginatedFacultyProfiles {
    items: FacultyProfile[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface FacultySkillCreate {
    skill_name: string;
    domain: string;
    level?: number;
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const resolveBackendAssetUrl = (path?: string | null): string | undefined => {
    if (!path) {
        return undefined;
    }
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
};

export const facultyApi = {
    listProfiles: async (skip: number = 0, limit: number = 100): Promise<FacultyProfile[]> => {
        const response = await http.get<FacultyProfile[]>('/api/v1/faculty/', {
            params: { skip, limit }
        });
        return response.data;
    },

    listProfilesPaginated: async (params?: { page?: number; pageSize?: number; search?: string; department?: string }): Promise<PaginatedFacultyProfiles> => {
        const response = await http.get<PaginatedFacultyProfiles>('/api/v1/faculty/paged', {
            params: {
                ...(params?.page ? { page: params.page } : {}),
                ...(params?.pageSize ? { page_size: params.pageSize } : {}),
                ...(params?.search ? { search: params.search } : {}),
                ...(params?.department ? { department: params.department } : {}),
            }
        });
        return response.data;
    },

    getMe: async (): Promise<FacultyProfile> => {
        const response = await http.get<FacultyProfile>('/api/v1/faculty/me');
        return response.data;
    },

    updateMe: async (data: FacultyProfileUpdate): Promise<FacultyProfile> => {
        const response = await http.patch<FacultyProfile>('/api/v1/faculty/me', data);
        return response.data;
    },

    uploadProfileImage: async (file: File): Promise<FacultyProfile> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await http.post<FacultyProfile>('/api/v1/faculty/me/profile-image', formData, {
            headers: { 'Content-Type': undefined },
        });
        return response.data;
    },

    addSkill: async (skillData: FacultySkillCreate): Promise<FacultySkill> => {
        const response = await http.post<FacultySkill>('/api/v1/faculty/me/skills', skillData);
        return response.data;
    },

    getProfile: async (id: string): Promise<FacultyProfile> => {
        const response = await http.get<FacultyProfile>(`/api/v1/faculty/${id}`);
        return response.data;
    },

    registerFaculty: async (data: any): Promise<FacultyProfile> => {
        const response = await http.post<FacultyProfile>('/api/v1/faculty/register-faculty', data);
        return response.data;
    },

    createFacultyAccount: async (data: FacultyAccountForm & { password: string }): Promise<FacultyProfile> => {
        const response = await http.post<FacultyProfile>('/api/v1/faculty/accounts', data);
        return response.data;
    },

    updateFacultyAccount: async (facultyId: string, data: FacultyAccountForm): Promise<FacultyProfile> => {
        const response = await http.put<FacultyProfile>(`/api/v1/faculty/${facultyId}/account`, data);
        return response.data;
    },

    resetFacultyPassword: async (facultyId: string, newPassword: string): Promise<FacultyProfile> => {
        const response = await http.post<FacultyProfile>(`/api/v1/faculty/${facultyId}/account/reset-password`, {
            new_password: newPassword,
        });
        return response.data;
    },

    deleteFacultyAccount: async (facultyId: string): Promise<void> => {
        await http.delete(`/api/v1/faculty/${facultyId}/account`);
    },

    verifySkill: async (facultyId: string, skillId: string): Promise<{ status: string }> => {
        const response = await http.post<{ status: string }>(`/api/v1/faculty/${facultyId}/verify-skill/${skillId}`);
        return response.data;
    },

    getSkillSuggestions: async (): Promise<{ suggested_skills: string[], reasoning: string }> => {
        const response = await http.get<{ suggested_skills: string[], reasoning: string }>('/api/v1/faculty/me/skill-suggestions');
        return response.data;
    }
}
