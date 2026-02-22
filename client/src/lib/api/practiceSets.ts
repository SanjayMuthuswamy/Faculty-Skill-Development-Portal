
import http from './http'
import { SkillDomain } from './skills'

export interface PracticeSetQuestion {
    id: string;
    set_id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation?: string;
}

export interface PracticeSet {
    id: string;
    faculty_id: string;
    domain: SkillDomain;
    difficulty: string;
    source: string;
    topic?: string;
    score?: number;
    accuracy?: number;
    completed_at?: string;
    created_at: string;
    questions: PracticeSetQuestion[];
}

export interface PracticeSetCreate {
    domain: SkillDomain;
    difficulty: string;
    source: string;
    topic?: string;
    count?: number;
}

export interface PracticeSetResultSubmit {
    score: number;
    accuracy: number;
}

export const practiceSetsApi = {
    generate: async (data: PracticeSetCreate): Promise<PracticeSet> => {
        const response = await http.post<PracticeSet>('/api/v1/practice-sets/', data);
        return response.data;
    },

    listMySets: async (): Promise<PracticeSet[]> => {
        const response = await http.get<PracticeSet[]>('/api/v1/practice-sets/me');
        return response.data;
    },

    getSet: async (id: string): Promise<PracticeSet> => {
        const response = await http.get<PracticeSet>(`/api/v1/practice-sets/${id}`);
        return response.data;
    },

    submitResult: async (id: string, result: PracticeSetResultSubmit): Promise<PracticeSet> => {
        const response = await http.post<PracticeSet>(`/api/v1/practice-sets/${id}/submit`, result);
        return response.data;
    }
}
