import http from './http'
import { SkillDomain } from './skills'

export enum ProgramStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED",
    UPCOMING = "UPCOMING",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED",
}

export enum EnrollmentStatus {
    ENROLLED = "Enrolled",
    IN_PROGRESS = "In Progress",
    COMPLETED = "Completed",
    DROPPED = "Dropped",
}

export interface Enrollment {
    id: string;
    program_id: string;
    faculty_id: string;
    status: EnrollmentStatus;
    enrolled_at: string;
}

export interface Program {
    id: string;
    title: string;
    description?: string;
    domain: SkillDomain;
    start_date?: string;
    end_date?: string;
    duration?: string;
    seats: number;
    mode: string;
    topics: string[];
    benefits: string[];
    status: ProgramStatus;
    created_by_id: string;
    created_at: string;
    enrollments: Enrollment[];
}

export interface ProgramCreate {
    title: string;
    description?: string;
    domain: SkillDomain;
    start_date?: string;
    end_date?: string;
    duration?: string;
    seats?: number;
    mode?: string;
    topics?: string[];
    benefits?: string[];
    status?: ProgramStatus;
}

export const programsApi = {
    listPrograms: async (skip: number = 0, limit: number = 100): Promise<Program[]> => {
        const response = await http.get<Program[]>('/api/v1/programs/', {
            params: { skip, limit }
        });
        return response.data;
    },

    getProgram: async (id: string): Promise<Program> => {
        const response = await http.get<Program>(`/api/v1/programs/${id}`);
        return response.data;
    },

    createProgram: async (programData: ProgramCreate): Promise<Program> => {
        const response = await http.post<Program>('/api/v1/programs/', programData);
        return response.data;
    },

    updateProgram: async (id: string, programData: Partial<ProgramCreate>): Promise<Program> => {
        const response = await http.patch<Program>(`/api/v1/programs/${id}`, programData);
        return response.data;
    },

    deleteProgram: async (id: string): Promise<{ status: string }> => {
        const response = await http.delete<{ status: string }>(`/api/v1/programs/${id}`);
        return response.data;
    }
}
