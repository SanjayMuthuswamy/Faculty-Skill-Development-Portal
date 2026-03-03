
import http from './http';
import { SkillDomain } from './skills';
import { Difficulty } from './tests';

export enum DraftBatchStatus {
    PENDING = 'pending',
    PUBLISHED = 'published',
    FAILED = 'failed',
}

export enum QuestionDraftStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface QuestionDraft {
    id: string;
    batch_id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation?: string;
    draft_status: QuestionDraftStatus;
}

export interface QuestionDraftBatch {
    id: string;
    topic: string;
    domain: SkillDomain;
    difficulty: Difficulty;
    status: DraftBatchStatus;
    created_by_id: string;
    created_at: string;
    questions: QuestionDraft[];
}

export interface QuestionDraftBatchCreate {
    topic: string;
    domain: SkillDomain;
    difficulty: Difficulty;
    prompt: string;
    count?: number;
}

export interface PublishConfig {
    domain: SkillDomain;
    packName?: string;
    topic: string;
    difficulty: Difficulty;
    existingPackId?: string;
    description?: string;
}

export const aiQuestionsApi = {
    generate: async (data: QuestionDraftBatchCreate): Promise<QuestionDraftBatch> => {
        const response = await http.post<QuestionDraftBatch>('/api/v1/ai-questions/generate', data);
        return response.data;
    },

    listBatches: async (): Promise<QuestionDraftBatch[]> => {
        const response = await http.get<QuestionDraftBatch[]>('/api/v1/ai-questions/batches');
        return response.data;
    },

    getBatch: async (id: string): Promise<QuestionDraftBatch> => {
        const response = await http.get<QuestionDraftBatch>(`/api/v1/ai-questions/batches/${id}`);
        return response.data;
    },

    updateQuestion: async (batchId: string, index: number, data: Partial<QuestionDraft>): Promise<QuestionDraft> => {
        const response = await http.patch<QuestionDraft>(`/api/v1/ai-questions/batches/${batchId}/questions/${index}`, data);
        return response.data;
    },

    approveQuestion: async (batchId: string, index: number): Promise<{ status: string }> => {
        const response = await http.post<{ status: string }>(`/api/v1/ai-questions/batches/${batchId}/approve/${index}`);
        return response.data;
    },

    rejectQuestion: async (batchId: string, index: number): Promise<{ status: string }> => {
        const response = await http.post<{ status: string }>(`/api/v1/ai-questions/batches/${batchId}/reject/${index}`);
        return response.data;
    },

    publishToPack: async (batchId: string, config: PublishConfig): Promise<{ status: string }> => {
        const response = await http.post<{ status: string }>(`/api/v1/ai-questions/batches/${batchId}/publish`, config);
        return response.data;
    }
};