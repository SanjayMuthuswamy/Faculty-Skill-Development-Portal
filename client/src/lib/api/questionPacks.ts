import http from './http'
import { SkillDomain } from './skills'
import { Difficulty } from './tests'

export enum PackStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED",
}

export enum QuestionOption {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
}

export interface Question {
    id: string;
    pack_id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuestionOption;
    explanation?: string;
    created_at: string;
}

export interface QuestionPack {
    id: string;
    pack_name: string;
    domain: SkillDomain;
    topic?: string;
    difficulty: Difficulty;
    description?: string;
    status: PackStatus;
    created_by_id: string;
    created_at: string;
    published_at?: string;
    questions: Question[];
}

export interface QuestionPackCreate {
    pack_name: string;
    domain: SkillDomain;
    topic?: string;
    difficulty?: Difficulty;
    description?: string;
    status?: PackStatus;
}

export interface QuestionCreate {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: QuestionOption;
    explanation?: string;
}

export interface PaginatedQuestionPacks {
    items: QuestionPack[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface PaginatedQuestions {
    items: Question[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export const questionPacksApi = {
    listPacks: async (skip: number = 0, limit: number = 100, domain?: string, status?: string): Promise<QuestionPack[]> => {
        const response = await http.get<QuestionPack[]>('/api/v1/question-packs/', {
            params: { skip, limit, domain, status }
        });
        return response.data;
    },

    listPacksPaginated: async (params?: {
        page?: number;
        pageSize?: number;
        search?: string;
        domain?: string;
        status?: string;
    }): Promise<PaginatedQuestionPacks> => {
        const response = await http.get<PaginatedQuestionPacks>('/api/v1/question-packs/paged', {
            params: {
                ...(params?.page ? { page: params.page } : {}),
                ...(params?.pageSize ? { page_size: params.pageSize } : {}),
                ...(params?.search ? { search: params.search } : {}),
                ...(params?.domain ? { domain: params.domain } : {}),
                ...(params?.status ? { status: params.status } : {}),
            }
        });
        return response.data;
    },

    getPack: async (id: string): Promise<QuestionPack> => {
        const response = await http.get<QuestionPack>(`/api/v1/question-packs/${id}`);
        return response.data;
    },

    createPack: async (packData: QuestionPackCreate): Promise<QuestionPack> => {
        const response = await http.post<QuestionPack>('/api/v1/question-packs/', packData);
        return response.data;
    },

    updatePack: async (id: string, packData: Partial<QuestionPackCreate>): Promise<QuestionPack> => {
        const response = await http.patch<QuestionPack>(`/api/v1/question-packs/${id}`, packData);
        return response.data;
    },

    deletePack: async (id: string): Promise<{ status: string }> => {
        const response = await http.delete<{ status: string }>(`/api/v1/question-packs/${id}`);
        return response.data;
    },

    addQuestion: async (packId: string, questionData: QuestionCreate): Promise<Question> => {
        const response = await http.post<Question>(`/api/v1/question-packs/${packId}/questions`, questionData);
        return response.data;
    },

    listAllQuestions: async (skip: number = 0, limit: number = 100): Promise<Question[]> => {
        const response = await http.get<Question[]>('/api/v1/question-packs/questions', {
            params: { skip, limit }
        });
        return response.data;
    },

    listAllQuestionsPaginated: async (params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedQuestions> => {
        const response = await http.get<PaginatedQuestions>('/api/v1/question-packs/questions/paged', {
            params: {
                ...(params?.page ? { page: params.page } : {}),
                ...(params?.pageSize ? { page_size: params.pageSize } : {}),
                ...(params?.search ? { search: params.search } : {}),
            }
        });
        return response.data;
    },

    updateQuestion: async (id: string, questionData: Partial<QuestionCreate>): Promise<Question> => {
        const response = await http.patch<Question>(`/api/v1/question-packs/questions/${id}`, questionData);
        return response.data;
    },

    deleteQuestion: async (id: string): Promise<{ status: string }> => {
        const response = await http.delete<{ status: string }>(`/api/v1/question-packs/questions/${id}`);
        return response.data;
    }
}
