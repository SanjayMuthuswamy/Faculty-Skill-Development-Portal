import { User, Program, Test, QuestionPack, Enrollment, TestAttempt, FacultySkill, QuestionDraft, CareerGoal, GrowthPlan, FacultyPerformanceDetail, AIPracticeSet, PracticeQuestion } from '../types';
import * as SEED from './seed';

const STORAGE_KEYS = {
    USERS: 'fsdp_users',
    PROGRAMS: 'fsdp_programs',
    TESTS: 'fsdp_tests',
    QUESTION_PACKS: 'fsdp_question_packs',
    ENROLLMENTS: 'fsdp_enrollments',
    ATTEMPTS: 'fsdp_attempts',
    SKILLS: 'fsdp_skills',
    QUESTION_DRAFTS: 'fsdp_question_drafts',
    CAREER_GOALS: 'fsdp_career_goals',
    GROWTH_PLANS: 'fsdp_growth_plans',
    PERFORMANCE: 'fsdp_performance',
    AI_PRACTICE_SETS: 'fsdp_ai_practice_sets',
};

export const initializeStorage = () => {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED.USERS));
    } else {
        // Ensure faculty@fsdp.com exists (fix for existing sessions)
        const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const facultyUser = SEED.USERS.find(u => u.email === 'faculty@fsdp.com');
        if (facultyUser && !storedUsers.find((u: User) => u.email === 'faculty@fsdp.com')) {
            storedUsers.push(facultyUser);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(storedUsers));
        }
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRAMS)) {
        localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(SEED.PROGRAMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TESTS)) {
        localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(SEED.TESTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUESTION_PACKS)) {
        localStorage.setItem(STORAGE_KEYS.QUESTION_PACKS, JSON.stringify(SEED.QUESTION_PACKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SKILLS)) {
        localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(SEED.SKILLS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CAREER_GOALS)) {
        localStorage.setItem(STORAGE_KEYS.CAREER_GOALS, JSON.stringify(SEED.CAREER_GOALS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GROWTH_PLANS)) {
        localStorage.setItem(STORAGE_KEYS.GROWTH_PLANS, JSON.stringify(SEED.GROWTH_PLANS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PERFORMANCE)) {
        localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(SEED.FACULTY_PERFORMANCE || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AI_PRACTICE_SETS)) {
        localStorage.setItem(STORAGE_KEYS.AI_PRACTICE_SETS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ENROLLMENTS)) localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
        localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(SEED.TEST_ATTEMPTS || []));
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUESTION_DRAFTS)) localStorage.setItem(STORAGE_KEYS.QUESTION_DRAFTS, JSON.stringify([]));
};

export const resetStorage = () => {
    // Clear all existing data
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });

    // Reinitialize with fresh seed data
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED.USERS));
    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(SEED.PROGRAMS));
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(SEED.TESTS));
    localStorage.setItem(STORAGE_KEYS.QUESTION_PACKS, JSON.stringify(SEED.QUESTION_PACKS));
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(SEED.SKILLS || []));
    localStorage.setItem(STORAGE_KEYS.CAREER_GOALS, JSON.stringify(SEED.CAREER_GOALS || []));
    localStorage.setItem(STORAGE_KEYS.GROWTH_PLANS, JSON.stringify(SEED.GROWTH_PLANS || []));
    localStorage.setItem(STORAGE_KEYS.PERFORMANCE, JSON.stringify(SEED.FACULTY_PERFORMANCE || []));
    localStorage.setItem(STORAGE_KEYS.AI_PRACTICE_SETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(SEED.TEST_ATTEMPTS || []));
    localStorage.setItem(STORAGE_KEYS.QUESTION_DRAFTS, JSON.stringify([]));

    console.log('✅ Storage has been reset with fresh seed data!');
};

const createStore = <T>(key: string) => ({
    getAll: (): T[] => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },
    set: (data: T[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    },
});

export const db = {
    users: createStore<User>(STORAGE_KEYS.USERS),
    programs: createStore<Program>(STORAGE_KEYS.PROGRAMS),
    tests: createStore<Test>(STORAGE_KEYS.TESTS),
    questionPacks: createStore<QuestionPack>(STORAGE_KEYS.QUESTION_PACKS),
    enrollments: createStore<Enrollment>(STORAGE_KEYS.ENROLLMENTS),
    attempts: createStore<TestAttempt>(STORAGE_KEYS.ATTEMPTS),
    skills: createStore<FacultySkill>(STORAGE_KEYS.SKILLS),
    questionDrafts: createStore<QuestionDraft>(STORAGE_KEYS.QUESTION_DRAFTS),
    careerGoals: createStore<CareerGoal>(STORAGE_KEYS.CAREER_GOALS),
    growthPlans: createStore<GrowthPlan>(STORAGE_KEYS.GROWTH_PLANS),
    performance: createStore<FacultyPerformanceDetail>(STORAGE_KEYS.PERFORMANCE),
    aiPracticeSets: createStore<AIPracticeSet>(STORAGE_KEYS.AI_PRACTICE_SETS),
};

export const getAuthSession = () => {
    const data = localStorage.getItem('fsdp_auth');
    return data ? JSON.parse(data) : null;
};

export const setAuthSession = (session: { user: User; token?: string }) => {
    localStorage.setItem('fsdp_auth', JSON.stringify(session));
};

export const clearAuthSession = () => {
    localStorage.removeItem('fsdp_auth');
};
