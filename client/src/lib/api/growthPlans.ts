import http from './http'
import { SkillDomain } from './skills'

export enum GrowthPlanStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    RESET = "RESET",
}

export interface WeekTask {
    id: string;
    week_id: string;
    label: string;
    done: boolean;
}

export interface GrowthWeek {
    id: string;
    plan_id: string;
    week_number: number;
    title: string;
    required_practice_count: number;
    required_min_avg_score: number;
    completed_practice_count: number;
    avg_score_for_week: number;
    completed: boolean;
    completed_at?: string;
    tasks: WeekTask[];
}

export interface GrowthPlan {
    id: string;
    faculty_id: string;
    domain: SkillDomain;
    target_skill: string;
    current_level: number;
    target_level: number;
    weekly_hours: number;
    status: GrowthPlanStatus;
    progress_percentage: number;
    created_at: string;
    reset_at?: string;
    weeks: GrowthWeek[];
}

export interface GrowthPlanCreate {
    domain: SkillDomain;
    target_skill: string;
    current_level: number;
    target_level: number;
    weekly_hours: number;
}

export const growthPlansApi = {
    createPlan: async (planData: GrowthPlanCreate): Promise<GrowthPlan> => {
        const response = await http.post<GrowthPlan>('/api/v1/growth-plans/', planData);
        return response.data;
    },

    getMyActivePlan: async (): Promise<GrowthPlan> => {
        const response = await http.get<GrowthPlan>('/api/v1/growth-plans/me');
        return response.data;
    },

    updateTaskStatus: async (taskId: string, done: boolean): Promise<{ status: string }> => {
        const response = await http.patch<{ status: string }>(`/api/v1/growth-plans/tasks/${taskId}`, null, {
            params: { done }
        });
        return response.data;
    },

    listPlans: async (skip: number = 0, limit: number = 100): Promise<GrowthPlan[]> => {
        const response = await http.get<GrowthPlan[]>('/api/v1/growth-plans/', {
            params: { skip, limit }
        });
        return response.data;
    },

    hardReset: async (): Promise<{ status: string }> => {
        const response = await http.delete<{ status: string }>('/api/v1/growth-plans/me');
        return response.data;
    },

    completeWeek: async (weekId: string): Promise<{ status: string }> => {
        const response = await http.post<{ status: string }>(`/api/v1/growth-plans/weeks/${weekId}/complete`);
        return response.data;
    }
}
