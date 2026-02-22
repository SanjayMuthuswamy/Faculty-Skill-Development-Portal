export type Role = 'admin' | 'faculty';

export type Domain = 'DBMS' | 'AI' | 'CLOUD' | 'CYBERSECURITY' | 'PEDAGOGY';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  apiToken?: string;
  department?: string;
  designation?: string;
  experience?: number;
  joinedDate?: string;
  skills?: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'pedagogy' | 'soft-skills';
}

export interface FacultySkill extends Skill {
  facultyId: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  status: 'VERIFIED' | 'SELF_DECLARED';
  verificationProgress?: {
    practiceTestsCompleted: number;
    requiredPracticeTests: number;
    assessmentScore?: number;
    requiredAssessmentScore: number;
  };
  lastAssessed?: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  mode: 'online' | 'offline' | 'hybrid';
  startDate: string;
  endDate: string;
  duration: string;
  seats: number;
  enrolledCount: number;
  skillTags: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  topics: string[];
  benefits: string[];
}

export interface Enrollment {
  programId: string;
  userId: string;
  enrolledAt: string;
  status: 'enrolled' | 'completed' | 'dropped';
}

export interface Question {
  id: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topic: string;
  tags?: string[];
}

export interface QuestionPack {
  id: string;
  packName: string;
  domain: Domain;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt?: string;
  createdBy: string;
  questions: Question[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  packIds: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  durationMinutes: number;
  totalQuestions: number;
  passScore: number;
  questionIds: string[];
  createdDate: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  userId: string;
  date: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: Record<string, string>;
  status: 'completed' | 'abandoned';
  timeTakenSeconds: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// --- Growth Plan & Career Goals ---

export interface CareerGoal {
  id: string;
  title: string;
  description: string;
  recommendedDomain: Domain;
  requiredSkills: {
    name: string;
    requiredLevel: number; // 1-5
  }[];
}

export interface RoadmapTask {
  id: string;
  label: string;
  done: boolean;
}

export interface RoadmapWeek {
  weekNumber: number;
  topics: string[];
  requiredPracticeCount: number;
  completedPracticeCount: number;
  requiredMinAvgScore: number;
  avgScoreForWeek: number;
  taskDescription: string;
  tasks: RoadmapTask[];
  completed: boolean;
  completedAt?: string;
}

export interface GrowthPlan {
  id: string;
  facultyId: string;
  domain: Domain;
  skill: string;
  currentLevel: number; // 1-5
  targetLevel: number; // 1-5
  weeklyHours: number;
  roadmapWeeks: RoadmapWeek[];
  progressPercentage: number;
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'ARCHIVED';
}

// --- AI Insights & Analytics ---

export interface performanceInsight {
  type: 'STRENGTH' | 'WEAKNESS' | 'RECOMMENDATION';
  topic: string;
  message: string;
}

export interface RiskIndicator {
  type: 'LOW_ENGAGEMENT' | 'LOW_SCORE' | 'SKILL_STAGNATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

export interface FacultyPerformanceDetail {
  facultyId: string;
  skillHeatmap: Record<string, number>;
  practiceHistory: {
    date: string;
    score: number;
    isAIPractice?: boolean;
  }[];
  weakestTopics: string[];
  riskIndicators: RiskIndicator[];
  careerProbability: number; // 0-100
  aiSummary: string;
  aiPracticeStats?: {
    totalSetsCompleted: number;
    averageAccuracy: number;
    topWeakDomains: Domain[];
  };
}

// --- AI Practice Sandbox ---

export interface PracticeQuestion extends Question {
  generatedForPractice: true;
  basedOnPackId?: string;
  basedOnQuestionId?: string;
}

export interface AIPracticeSet {
  id: string;
  facultyId: string;
  domain: Domain;
  topic?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  source: 'WEAKNESS' | 'CUSTOM' | 'PACK';
  createdAt: string;
  questions: PracticeQuestion[];
  result?: {
    score: number;
    accuracy: number;
    submittedAt: string;
  };
}

// --- AI Question Generator types ---

export type DraftQuestionStatus = 'pending' | 'approved' | 'rejected';
export type DraftBatchStatus = 'draft' | 'approved' | 'published';

export interface DraftQuestion extends Question {
  draftStatus: DraftQuestionStatus;
}

export interface QuestionDraft {
  id: string;
  topic: string;
  skill: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  prompt: string;
  generatedQuestions: DraftQuestion[];
  status: DraftBatchStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

// --- Trends & Resources types ---

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  skillTag: string;
}

export interface NewsCache {
  [topic: string]: {
    items: NewsArticle[];
    lastFetchedAt: string;
  };
}
