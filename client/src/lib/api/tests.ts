import http from './http'
import { SkillDomain } from './skills'
import { Question } from './questionPacks'

export enum Difficulty {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD",
    MIXED = "MIXED",
}

export interface Test {
    id: string;
    title: string;
    description?: string;
    short_description?: string;
    instructions?: string;
    tags: string[];
    domain: SkillDomain;
    difficulty: Difficulty;
    pass_marks: number;
    time_limit_minutes: number;
    is_published: boolean;
    total_questions: number;
    created_by_id: string;
    created_at: string;
    questions?: Question[];
    pack_ids?: string[];
    question_ids?: string[];
}

export interface TestCreate {
    title: string;
    description?: string;
    short_description?: string;
    instructions?: string;
    tags?: string[];
    domain: SkillDomain;
    difficulty?: Difficulty;
    pass_marks?: number;
    time_limit_minutes?: number;
    is_published?: boolean;
    pack_ids: string[];
    question_ids?: string[];
}

export const testsApi = {
    listTests: async (skip: number = 0, limit: number = 100): Promise<Test[]> => {
        const response = await http.get<Test[]>('/api/v1/tests/', {
            params: { skip, limit }
        });
        return response.data;
    },

    getTest: async (id: string): Promise<Test> => {
        const response = await http.get<Test>(`/api/v1/tests/${id}`);
        return response.data;
    },

    createTest: async (testData: TestCreate): Promise<Test> => {
        const response = await http.post<Test>('/api/v1/tests/', testData);
        return response.data;
    },

    createTestsBulk: async (tests: TestCreate[]): Promise<Test[]> => {
        const response = await http.post<Test[]>('/api/v1/tests/bulk', { tests });
        return response.data;
    },

    updateTest: async (id: string, testData: Partial<TestCreate>): Promise<Test> => {
        const response = await http.patch<Test>(`/api/v1/tests/${id}`, testData);
        return response.data;
    },

    deleteTest: async (id: string): Promise<{ status: string }> => {
        const response = await http.delete<{ status: string }>(`/api/v1/tests/${id}`);
        return response.data;
    }
}
