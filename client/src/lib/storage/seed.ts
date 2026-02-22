import { User, Program, Test, QuestionPack, FacultySkill, CareerGoal, GrowthPlan, FacultyPerformanceDetail, TestAttempt } from '../types';

export const USERS: User[] = [
    {
        id: '1',
        name: 'Admin User',
        email: 'admin@fsdp.com',
        role: 'admin',
        apiToken: 'admin-token-123',
        department: 'Administration',
        designation: 'System Admin',
        experience: 10,
        joinedDate: '2023-01-01',
    },
    {
        id: '2',
        name: 'Dr. Arun Kumar',
        email: 'arun@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-arun',
        department: 'Computer Science',
        designation: 'Associate Professor',
        experience: 8,
        joinedDate: '2023-01-15',
    },
    {
        id: '3',
        name: 'Dr. Priya Sharma',
        email: 'priya@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-priya',
        department: 'Electronics',
        designation: 'Assistant Professor',
        experience: 4,
        joinedDate: '2023-08-20',
    },
    {
        id: '4',
        name: 'Dr. Rajesh Verma',
        email: 'rajesh@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-rajesh',
        department: 'Civil Engineering',
        designation: 'Professor',
        experience: 15,
        joinedDate: '2022-06-10',
    },
    {
        id: '5',
        name: 'Dr. Meera Nair',
        email: 'meera@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-meera',
        department: 'Mechanical Engineering',
        designation: 'Assistant Professor',
        experience: 6,
        joinedDate: '2023-03-15',
    },
    {
        id: '6',
        name: 'Dr. Suresh Reddy',
        email: 'suresh@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-suresh',
        department: 'Electrical Engineering',
        designation: 'Associate Professor',
        experience: 10,
        joinedDate: '2022-09-01',
    },
    {
        id: '7',
        name: 'Faculty User',
        email: 'faculty@fsdp.com',
        role: 'faculty',
        apiToken: 'faculty-token-demo',
        department: 'Computer Science',
        designation: 'Professor',
        experience: 12,
        joinedDate: '2022-01-01',
    },
];

export const PROGRAMS: Program[] = [
    {
        id: '101',
        title: 'Advanced AI & Machine Learning',
        description: 'A comprehensive workshop on modern AI techniques, including Deep Learning and NLP.',
        mode: 'online',
        startDate: '2023-11-15',
        endDate: '2023-11-30',
        duration: '2 Weeks',
        seats: 50,
        enrolledCount: 12,
        skillTags: ['AI', 'Python', 'Data Science'],
        status: 'upcoming',
        topics: [
            'Introduction to AI & ML',
            'Supervised vs Unsupervised Learning',
            'Neural Networks & Deep Learning',
            'Natural Language Processing (NLP)',
            'Computer Vision Basics',
            'Hands-on Project'
        ],
        benefits: [
            'Master core AI concepts',
            'Build real-world ML models',
            'Gain hands-on experience with Python libraries',
            'Certificate of Completion'
        ]
    },
    {
        id: '102',
        title: 'Effective Pedagogy for Engineering',
        description: 'Learn innovative teaching strategies to engage engineering students better.',
        mode: 'offline',
        startDate: '2023-10-01',
        endDate: '2023-10-05',
        duration: '1 Week',
        seats: 30,
        enrolledCount: 28,
        skillTags: ['Pedagogy', 'Teaching'],
        status: 'completed',
        topics: [
            'Active Learning Strategies',
            'Flipped Classroom Model',
            'Assessment & Feedback',
            'Technology in the Classroom',
            'Student Engagement Techniques'
        ],
        benefits: [
            'Improve student engagement',
            'Design effective course curriculum',
            'Implement modern teaching methodologies',
            'Network with other faculty members'
        ]
    },
];

export const QUESTION_PACKS: QuestionPack[] = [
    {
        id: 'p1',
        packName: 'AI Fundamentals',
        domain: 'AI',
        topic: 'Neural Networks',
        difficulty: 'MEDIUM',
        description: 'Basic concepts of neural networks and deep learning.',
        status: 'PUBLISHED',
        createdAt: '2023-10-01T10:00:00Z',
        publishedAt: '2023-10-01T10:00:00Z',
        createdBy: '1',
        questions: [
            {
                id: 'q1',
                questionText: 'What is the primary function of a Convolutional Neural Network (CNN)?',
                options: {
                    A: 'Text processing',
                    B: 'Image recognition and processing',
                    C: 'Audio synthesis',
                    D: 'Database management'
                },
                correctOption: 'B',
                explanation: 'CNNs are specifically designed to process pixel data and are widely used for image recognition.',
                difficulty: 'MEDIUM',
                topic: 'Deep Learning',
            }
        ]
    }
];

export const TESTS: Test[] = [
    {
        id: 't1',
        title: 'AI Fundamentals Quiz',
        description: 'Test your basic knowledge of Artificial Intelligence concepts.',
        domain: 'AI',
        packIds: ['p1'],
        difficulty: 'MEDIUM',
        durationMinutes: 15,
        totalQuestions: 1,
        passScore: 70,
        questionIds: ['q1'],
        createdDate: '2023-09-01',
    },
];

export const SKILLS: FacultySkill[] = [
    {
        id: 's1',
        facultyId: '2',
        name: 'React',
        category: 'technical',
        level: 'ADVANCED',
        status: 'VERIFIED',
        lastAssessed: '2024-01-01'
    },
    {
        id: 's2',
        facultyId: '2',
        name: 'Python',
        category: 'technical',
        level: 'INTERMEDIATE',
        status: 'SELF_DECLARED',
        verificationProgress: {
            practiceTestsCompleted: 2,
            requiredPracticeTests: 5,
            requiredAssessmentScore: 70
        },
        lastAssessed: '2024-02-10'
    },
    {
        id: 's3',
        facultyId: '4',
        name: 'AutoCAD',
        category: 'technical',
        level: 'EXPERT',
        status: 'VERIFIED',
        lastAssessed: '2024-01-20'
    },
    {
        id: 's4',
        facultyId: '4',
        name: 'Structural Analysis',
        category: 'technical',
        level: 'ADVANCED',
        status: 'VERIFIED',
        lastAssessed: '2024-02-01'
    },
    {
        id: 's5',
        facultyId: '5',
        name: 'SolidWorks',
        category: 'technical',
        level: 'INTERMEDIATE',
        status: 'SELF_DECLARED',
        verificationProgress: {
            practiceTestsCompleted: 1,
            requiredPracticeTests: 4,
            requiredAssessmentScore: 70
        },
        lastAssessed: '2024-02-08'
    },
    {
        id: 's6',
        facultyId: '5',
        name: 'Thermodynamics',
        category: 'technical',
        level: 'ADVANCED',
        status: 'VERIFIED',
        lastAssessed: '2024-01-15'
    },
    {
        id: 's7',
        facultyId: '6',
        name: 'Circuit Design',
        category: 'technical',
        level: 'EXPERT',
        status: 'VERIFIED',
        lastAssessed: '2024-02-05'
    },
    {
        id: 's8',
        facultyId: '6',
        name: 'MATLAB',
        category: 'technical',
        level: 'ADVANCED',
        status: 'VERIFIED',
        lastAssessed: '2024-01-25'
    },
];

export const CAREER_GOALS: CareerGoal[] = [
    {
        id: 'cg1',
        title: 'Data Science Specialist',
        description: 'Master data analysis, statistical modeling, and machine learning.',
        recommendedDomain: 'AI',
        requiredSkills: [
            { name: 'Python', requiredLevel: 4 },
            { name: 'Data Visualization', requiredLevel: 3 },
            { name: 'SQL Foundations', requiredLevel: 3 }
        ]
    }
];

export const GROWTH_PLANS: GrowthPlan[] = [
    {
        id: 'gp1',
        facultyId: '2',
        domain: 'DBMS',
        skill: 'Advanced Query Optimization',
        currentLevel: 2,
        targetLevel: 4,
        weeklyHours: 10,
        startDate: '2024-02-01',
        progressPercentage: 25,
        status: 'ACTIVE',
        roadmapWeeks: [
            {
                weekNumber: 1,
                topics: ['SQL Indexing Basics', 'Execution Plans'],
                requiredPracticeCount: 2,
                completedPracticeCount: 2,
                requiredMinAvgScore: 70,
                avgScoreForWeek: 75,
                taskDescription: 'Study indexing basics and complete 2 practice sets.',
                tasks: [
                    { id: 't1', label: 'Watch indexing tutorial', done: true },
                    { id: 't2', label: 'Read execution plan docs', done: true }
                ],
                completed: true
            }
        ]
    }
];

export const FACULTY_PERFORMANCE: FacultyPerformanceDetail[] = [
    {
        facultyId: '2',
        skillHeatmap: { 'AI': 4, 'DBMS': 5, 'CLOUD': 3, 'CYBERSECURITY': 2, 'PEDAGOGY': 4 },
        practiceHistory: [
            { date: '2024-02-01', score: 85 },
            { date: '2024-02-05', score: 92 },
            { date: '2024-02-12', score: 78 }
        ],
        weakestTopics: ['Neural Networks', 'Cybersecurity Basics'],
        riskIndicators: [],
        careerProbability: 88,
        aiSummary: 'Strong performance in core technical domains. Ready for advanced certifications.'
    },
    {
        facultyId: '3',
        skillHeatmap: { 'AI': 2, 'DBMS': 2, 'CLOUD': 5, 'CYBERSECURITY': 4, 'PEDAGOGY': 3 },
        practiceHistory: [
            { date: '2024-02-01', score: 45 },
            { date: '2024-02-08', score: 52 }
        ],
        weakestTopics: ['AI Fundamentals', 'Database Normalization'],
        riskIndicators: [
            { type: 'SKILL_STAGNATION', message: 'Stagnant progress in AI Roadmap', severity: 'HIGH' },
            { type: 'LOW_ENGAGEMENT', message: 'Low practice engagement', severity: 'MEDIUM' }
        ],
        careerProbability: 35,
        aiSummary: 'At risk of falling behind in institutional AI goals. Needs additional support in Cloud Security.'
    },
    {
        facultyId: '4',
        skillHeatmap: { 'AI': 3, 'DBMS': 4, 'CLOUD': 3, 'CYBERSECURITY': 3, 'PEDAGOGY': 5 },
        practiceHistory: [
            { date: '2024-02-03', score: 82 },
            { date: '2024-02-10', score: 88 },
            { date: '2024-02-14', score: 85 }
        ],
        weakestTopics: ['Cloud Architecture', 'Machine Learning'],
        riskIndicators: [],
        careerProbability: 78,
        aiSummary: 'Consistent performer with strong teaching pedagogy. Ready for leadership roles.'
    },
    {
        facultyId: '5',
        skillHeatmap: { 'AI': 3, 'DBMS': 3, 'CLOUD': 4, 'CYBERSECURITY': 3, 'PEDAGOGY': 4 },
        practiceHistory: [
            { date: '2024-02-02', score: 68 },
            { date: '2024-02-09', score: 72 },
            { date: '2024-02-13', score: 75 }
        ],
        weakestTopics: ['Advanced AI Algorithms', 'Database Optimization'],
        riskIndicators: [
            { type: 'LOW_SCORE', message: 'Gradual improvement observed', severity: 'LOW' }
        ],
        careerProbability: 65,
        aiSummary: 'Showing steady improvement. Encourage continued practice in advanced topics.'
    },
    {
        facultyId: '6',
        skillHeatmap: { 'AI': 4, 'DBMS': 4, 'CLOUD': 5, 'CYBERSECURITY': 5, 'PEDAGOGY': 4 },
        practiceHistory: [
            { date: '2024-02-04', score: 91 },
            { date: '2024-02-11', score: 89 },
            { date: '2024-02-14', score: 94 }
        ],
        weakestTopics: ['Teaching Methodology'],
        riskIndicators: [],
        careerProbability: 92,
        aiSummary: 'Excellent technical proficiency. Top performer in Cloud and Cybersecurity domains.'
    }
];

export const TEST_ATTEMPTS: TestAttempt[] = [
    {
        id: 'att1',
        testId: 't1',
        userId: '2',
        date: '2024-02-01T10:00:00Z',
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        answers: {},
        status: 'completed',
        timeTakenSeconds: 600
    },
    {
        id: 'att2',
        testId: 't1',
        userId: '2',
        date: '2024-02-05T14:30:00Z',
        score: 92,
        totalQuestions: 10,
        correctAnswers: 9,
        answers: {},
        status: 'completed',
        timeTakenSeconds: 540
    },
    {
        id: 'att3',
        testId: 't1',
        userId: '2',
        date: '2024-02-12T09:15:00Z',
        score: 78,
        totalQuestions: 10,
        correctAnswers: 7,
        answers: {},
        status: 'completed',
        timeTakenSeconds: 720
    }
];

export const ID_COUNTERS = {
    users: 8,
    programs: 104,
    packs: 3,
    questions: 3,
    tests: 3,
    careerGoals: 3,
    growthPlans: 2,
    attempts: 4
};
