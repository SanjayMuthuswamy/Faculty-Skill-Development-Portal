export type Role = 'admin' | 'faculty';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  apiToken?: string; // Simulated token
  // Profile details for faculty
  department?: string;
  designation?: string;
  experience?: number; // in years
  joinedDate?: string;
}

export interface Skill {
  id: string;
  name: string; // e.g., 'Python', 'React', 'Data Analysis'
  category: 'technical' | 'pedagogy' | 'soft-skills';
}

export interface FacultySkill extends Skill {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lastAssessed?: string; // ISO Date
}

export interface Program {
  id: string;
  title: string;
  description: string;
  mode: 'online' | 'offline' | 'hybrid';
  startDate: string;
  endDate: string;
  duration: string; // e.g. "2 Weeks"
  seats: number;
  enrolledCount: number;
  skillTags: string[]; // e.g. ['AI', 'Python']
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface Enrollment {
  programId: string;
  userId: string;
  enrolledAt: string;
  status: 'enrolled' | 'completed' | 'dropped';
  attendancePercentage?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number; // 0-3
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  skill: string;
  topic: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  skill: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  durationMinutes: number;
  totalQuestions: number;
  passScore: number;
  questions: string[]; // Array of Question IDs
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
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  status: 'completed' | 'abandoned';
  timeTakenSeconds: number;
}

export interface AttendanceRecord {
  programId: string;
  date: string;
  records: {
    userId: string;
    status: 'present' | 'absent';
  }[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
