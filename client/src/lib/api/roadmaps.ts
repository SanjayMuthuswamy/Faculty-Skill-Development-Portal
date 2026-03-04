import http from './http'
import { AxiosError } from 'axios'

// --- Types ---

export interface RoadmapResource {
    title: string;
    url: string;
}

export interface RoadmapItemProgress {
    id: string;
    item_type: 'goal' | 'practice';
    item_index: number;
    completed: boolean;
}

export interface RoadmapWeek {
    week: number;
    goals: string[];
    topics: string[];
    resources: RoadmapResource[];
    practice: string[];
    items: RoadmapItemProgress[];
}

export interface RoadmapResponse {
    id: string;
    skill: string;
    weeks: number;
    hours_per_week: number;
    current_level: string;
    weekly_plan: RoadmapWeek[];
    created_at: string;
}

export interface RoadmapGenerateRequest {
    skill: string;
    weeks: number;
    hours_per_week: number;
    current_level: string;
}

export interface RoadmapProgressUpdate {
    week: number;
    item_type: 'goal' | 'practice';
    item_index: number;
    completed: boolean;
}

// --- API Client ---

export const roadmapsApi = {
    generate: async (data: RoadmapGenerateRequest): Promise<RoadmapResponse> => {
        const response = await http.post<RoadmapResponse>('/api/v1/roadmaps/', data);
        return response.data;
    },

    getLatest: async (): Promise<RoadmapResponse | null> => {
        try {
            const response = await http.get<RoadmapResponse>('/api/v1/roadmaps/latest');
            return response.data;
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 404) {
                return null;
            }
            throw err;
        }
    },

    getRoadmap: async (id: string): Promise<RoadmapResponse> => {
        const response = await http.get<RoadmapResponse>(`/api/v1/roadmaps/${id}`);
        return response.data;
    },

    updateProgress: async (roadmapId: string, data: RoadmapProgressUpdate): Promise<{ status: string }> => {
        const response = await http.patch<{ status: string }>(`/api/v1/roadmaps/${roadmapId}/progress`, data);
        return response.data;
    },
};
