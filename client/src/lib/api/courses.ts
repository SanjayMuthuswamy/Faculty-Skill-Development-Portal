import http from './http';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModuleQuiz {
    id: string;
    module_id: string;
    question_text: string;
    options: Record<string, string>;
    correct_answer: string;
    explanation: string;
}

export interface CourseModule {
    id: string;
    course_id: string;
    title: string;
    description?: string;
    order_index: number;
    video_url?: string;
    video_duration_seconds: number;
    notes_url?: string;
    key_takeaways: string[];
    quiz_questions: ModuleQuiz[];
}

export interface Course {
    id: string;
    title: string;
    description?: string;
    short_description?: string;
    prerequisites: string[];
    learning_outcomes: string[];
    instructor_name: string;
    duration_hours: number;
    estimated_weeks: number;
    skill_level: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    thumbnail_url?: string;
    is_published: boolean;
    created_at: string;
    modules: CourseModule[];
    module_count?: number;
}

export interface CourseEnrollment {
    id: string;
    faculty_id: string;
    course_id: string;
    enrolled_at: string;
    completed_at?: string;
    certificate_issued: boolean;
    course?: Course;
}

export interface LessonProgress {
    id: string;
    faculty_id: string;
    module_id: string;
    watched_seconds: number;
    completed: boolean;
    quiz_score?: number;
    quiz_passed: boolean;
}

export interface CourseProgress {
    total_modules: number;
    completed_modules: number;
    progress_pct: number;
    avg_quiz_score?: number;
    all_done: boolean;
    module_progress: {
        module_id: string;
        completed: boolean;
        quiz_score?: number;
        quiz_passed: boolean;
    }[];
}

export interface AssessmentQuestion {
    id: string;
    course_id: string;
    question_text: string;
    options: Record<string, string>;
}

export interface AdminAssessmentQuestion extends AssessmentQuestion {
    correct_answer: string;
    explanation: string;
}

export interface CourseAttempt {
    id: string;
    faculty_id: string;
    course_id: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    passed: boolean;
    ai_feedback?: { weak_areas: string[]; suggestions: string[] };
    submitted_at?: string;
}

export interface CourseAnalytics {
    course_id: string;
    course_title: string;
    total_enrolled: number;
    total_completed: number;
    completion_rate: number;
    average_score: number;
}

export interface AIGenerateQuestionsPayload {
    prompt?: string;
    count?: number;
    difficulty?: string;
}

export interface AIGenerateQuestionsResult {
    generated_count: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const coursesApi = {
    // Courses
    listCourses: (): Promise<Course[]> =>
        http.get('/api/v1/courses').then(r => r.data),

    getCourse: (id: string): Promise<Course> =>
        http.get(`/api/v1/courses/${id}`).then(r => r.data),

    createCourse: (data: Partial<Course>): Promise<Course> =>
        http.post('/api/v1/courses', data).then(r => r.data),

    createCoursesBulk: (courses: Partial<Course>[]): Promise<Course[]> =>
        http.post('/api/v1/courses/bulk', { courses }).then(r => r.data),

    updateCourse: (id: string, data: Partial<Course>): Promise<Course> =>
        http.put(`/api/v1/courses/${id}`, data).then(r => r.data),

    deleteCourse: (id: string): Promise<void> =>
        http.delete(`/api/v1/courses/${id}`).then(r => r.data),

    // Modules
    addModule: (courseId: string, data: Partial<CourseModule>): Promise<CourseModule> =>
        http.post(`/api/v1/courses/${courseId}/modules`, data).then(r => r.data),

    updateModule: (courseId: string, moduleId: string, data: Partial<CourseModule>): Promise<CourseModule> =>
        http.put(`/api/v1/courses/${courseId}/modules/${moduleId}`, data).then(r => r.data),

    deleteModule: (courseId: string, moduleId: string): Promise<void> =>
        http.delete(`/api/v1/courses/${courseId}/modules/${moduleId}`).then(r => r.data),

    // Quiz
    addQuizQuestion: (courseId: string, moduleId: string, data: Partial<ModuleQuiz>): Promise<ModuleQuiz> =>
        http.post(`/api/v1/courses/${courseId}/modules/${moduleId}/quiz`, data).then(r => r.data),

    generateModuleQuizQuestions: (
        courseId: string,
        moduleId: string,
        data: AIGenerateQuestionsPayload
    ): Promise<AIGenerateQuestionsResult> =>
        http.post(`/api/v1/courses/${courseId}/modules/${moduleId}/quiz/generate`, data).then(r => r.data),

    deleteQuizQuestion: (courseId: string, moduleId: string, quizId: string): Promise<void> =>
        http.delete(`/api/v1/courses/${courseId}/modules/${moduleId}/quiz/${quizId}`).then(r => r.data),

    updateQuizQuestion: (
        courseId: string,
        moduleId: string,
        quizId: string,
        data: Partial<ModuleQuiz>
    ): Promise<ModuleQuiz> =>
        http.put(`/api/v1/courses/${courseId}/modules/${moduleId}/quiz/${quizId}`, data).then(r => r.data),

    // Assessment questions
    addAssessmentQuestion: (courseId: string, data: object): Promise<AssessmentQuestion> =>
        http.post(`/api/v1/courses/${courseId}/assessment-questions`, data).then(r => r.data),

    listAdminAssessmentQuestions: (courseId: string): Promise<AdminAssessmentQuestion[]> =>
        http.get(`/api/v1/courses/${courseId}/assessment-questions`).then(r => r.data),

    generateAssessmentQuestions: (
        courseId: string,
        data: AIGenerateQuestionsPayload
    ): Promise<AIGenerateQuestionsResult> =>
        http.post(`/api/v1/courses/${courseId}/assessment-questions/generate`, data).then(r => r.data),

    deleteAssessmentQuestion: (courseId: string, questionId: string): Promise<void> =>
        http.delete(`/api/v1/courses/${courseId}/assessment-questions/${questionId}`).then(r => r.data),

    updateAssessmentQuestion: (
        courseId: string,
        questionId: string,
        data: Partial<AdminAssessmentQuestion>
    ): Promise<AdminAssessmentQuestion> =>
        http.put(`/api/v1/courses/${courseId}/assessment-questions/${questionId}`, data).then(r => r.data),

    // Enrollment
    enrollInCourse: (courseId: string): Promise<CourseEnrollment> =>
        http.post(`/api/v1/courses/${courseId}/enroll`).then(r => r.data),

    getMyEnrollments: (): Promise<CourseEnrollment[]> =>
        http.get('/api/v1/courses/my-enrollments').then(r => r.data),

    // Progress
    getCourseProgress: (courseId: string): Promise<CourseProgress> =>
        http.get(`/api/v1/courses/${courseId}/progress`).then(r => r.data),

    updateLessonProgress: (moduleId: string, data: { watched_seconds: number; completed: boolean }): Promise<LessonProgress> =>
        http.put(`/api/v1/courses/progress/${moduleId}`, data).then(r => r.data),

    submitMiniQuiz: (moduleId: string, answers: Record<string, string>): Promise<LessonProgress> =>
        http.post(`/api/v1/courses/progress/${moduleId}/quiz`, { answers }).then(r => r.data),

    // Assessment
    getAssessment: (courseId: string): Promise<AssessmentQuestion[]> =>
        http.get(`/api/v1/courses/${courseId}/assessment`).then(r => r.data),

    submitAssessment: (courseId: string, answers: Record<string, string>, timeTaken: number): Promise<CourseAttempt> =>
        http.post(`/api/v1/courses/${courseId}/assessment`, { answers, time_taken_seconds: timeTaken }).then(r => r.data),

    getMyAttempt: (courseId: string): Promise<CourseAttempt> =>
        http.get(`/api/v1/courses/${courseId}/attempt`).then(r => r.data),

    // Admin analytics
    getAnalytics: (): Promise<CourseAnalytics[]> =>
        http.get('/api/v1/courses/analytics').then(r => {
            if (Array.isArray(r.data)) return r.data as CourseAnalytics[];
            if (Array.isArray(r.data?.data)) return r.data.data as CourseAnalytics[];
            if (Array.isArray(r.data?.items)) return r.data.items as CourseAnalytics[];
            return [];
        }),
};

