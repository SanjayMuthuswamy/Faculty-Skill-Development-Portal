import http from './http'

export interface AttemptAnswer {
    question_id: string;
    selected_option: string;
    is_correct?: boolean;
}

export interface Attempt {
    id: string;
    faculty_id: string;
    test_id?: string;
    skill_id?: string;
    score: number;
    total_questions: number;
    accuracy: number;
    completed_at: string;
    test_title?: string;
    domain?: string;
    answers?: AttemptAnswer[];
}

export interface AttemptCreate {
    test_id: string;
}

export interface SubmitAttempt {
    answers: { question_id: string; selected_option: string }[];
}

export const attemptsApi = {
    createAttempt: async (data: AttemptCreate): Promise<Attempt> => {
        const response = await http.post<Attempt>('/api/v1/attempts/', data);
        return response.data;
    },

    getFacultyAttempts: async (facultyId: string): Promise<Attempt[]> => {
        const response = await http.get<Attempt[]>(`/api/v1/attempts/faculty/${facultyId}`);
        return response.data;
    },

    getMyAttempts: async (): Promise<Attempt[]> => {
        const response = await http.get<Attempt[]>('/api/v1/attempts/me');
        return response.data;
    },

    getAttempt: async (id: string): Promise<Attempt> => {
        const response = await http.get<Attempt>(`/api/v1/attempts/${id}`);
        return response.data;
    },

    submitAttempt: async (id: string, data: SubmitAttempt): Promise<Attempt> => {
        const response = await http.post<Attempt>(`/api/v1/attempts/${id}/submit`, data);
        return response.data;
    }
}
