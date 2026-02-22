import http from './http'
import { Enrollment, EnrollmentStatus } from './programs'

export interface EnrollmentCreate {
    program_id: string;
}

export interface EnrollmentUpdate {
    status: EnrollmentStatus;
}

export const enrollmentsApi = {
    enroll: async (enrollData: EnrollmentCreate): Promise<Enrollment> => {
        const response = await http.post<Enrollment>('/api/v1/enrollments/', enrollData);
        return response.data;
    },

    getMyEnrollments: async (): Promise<Enrollment[]> => {
        const response = await http.get<Enrollment[]>('/api/v1/enrollments/me');
        return response.data;
    }
}
