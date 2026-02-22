import http from './http'

export interface FacultyAnalytics {
    faculty_id: string;
    faculty_name: string;
    department?: string;
    verified_skills_count: number;
    attempts_count: number;
    avg_accuracy: number;
    active_plan_progress: number;
}

export interface DepartmentSummary {
    department: string;
    faculty_count: number;
    avg_accuracy: number;
    total_attempts: number;
    plan_adoption_rate: number;
    verified_skills_rate: number;
    total_enrollments: number;
}

export const analyticsApi = {
    getDepartmentSummary: async (): Promise<DepartmentSummary[]> => {
        const response = await http.get<DepartmentSummary[]>('/api/v1/analytics/department-summary');
        return response.data;
    },

    getFacultyAnalytics: async (facultyId: string): Promise<FacultyAnalytics> => {
        const response = await http.get<FacultyAnalytics>(`/api/v1/analytics/faculty/${facultyId}`);
        return response.data;
    },

    getMyAnalytics: async (): Promise<FacultyAnalytics> => {
        const response = await http.get<FacultyAnalytics>('/api/v1/analytics/me');
        return response.data;
    }
}
