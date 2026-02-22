import { db, initializeStorage } from '../storage';
import { User, Program, Test, Question, Enrollment, TestAttempt, FacultySkill, QuestionDraft, DraftQuestion, NewsArticle, Domain, QuestionPack, CareerGoal, GrowthPlan, RoadmapWeek, FacultyPerformanceDetail, AIPracticeSet, PracticeQuestion } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

initializeStorage();

// --- AI Question Template Bank (used to simulate AI generation) ---
const QUESTION_TEMPLATES: Record<string, { text: string; options: string[]; correctOptionIndex: number; explanation: string }[]> = {
    'DBMS': [
        { text: 'What is normalization in DBMS?', options: ['Reducing data redundancy', 'Adding more tables', 'Deleting unused data', 'Compressing files'], correctOptionIndex: 0, explanation: 'Normalization is a process of organizing data to reduce redundancy.' },
        { text: 'Which normal form eliminates partial dependencies?', options: ['1NF', '2NF', '3NF', 'BCNF'], correctOptionIndex: 1, explanation: '2NF eliminates partial dependencies on a composite primary key.' },
        { text: 'What does ACID stand for in database transactions?', options: ['Atomicity, Consistency, Isolation, Durability', 'Addition, Control, Input, Data', 'Access, Create, Insert, Delete', 'Automatic, Controlled, Integrated, Distributed'], correctOptionIndex: 0, explanation: 'ACID ensures reliable processing of database transactions.' },
        { text: 'Which SQL clause is used to filter groups?', options: ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'], correctOptionIndex: 2, explanation: 'HAVING filters groups after GROUP BY, while WHERE filters rows before grouping.' },
        { text: 'What is a foreign key?', options: ['A key from another table used to establish a link', 'A primary key of the same table', 'An encrypted key', 'A key used for indexing'], correctOptionIndex: 0, explanation: 'A foreign key establishes a referential link between two tables.' },
    ],
    'AI': [
        { text: 'What is the primary goal of supervised learning?', options: ['Learning from labeled data', 'Clustering similar data', 'Maximizing rewards', 'Reducing dimensionality'], correctOptionIndex: 0, explanation: 'Supervised learning uses labeled training data to learn a mapping function.' },
        { text: 'Which activation function is commonly used in hidden layers of deep networks?', options: ['Sigmoid', 'ReLU', 'Softmax', 'Step'], correctOptionIndex: 1, explanation: 'ReLU (Rectified Linear Unit) is preferred for its simplicity and effectiveness.' },
        { text: 'What does NLP stand for?', options: ['Neural Language Processing', 'Natural Language Processing', 'Network Learning Protocol', 'Nested Linear Programming'], correctOptionIndex: 1, explanation: 'NLP enables computers to understand and process human language.' },
        { text: 'Which of the following is an unsupervised learning algorithm?', options: ['Linear Regression', 'K-Means Clustering', 'Decision Trees', 'Logistic Regression'], correctOptionIndex: 1, explanation: 'K-Means is an unsupervised algorithm that groups data into clusters.' },
        { text: 'What is overfitting?', options: ['Model performs well on training data but poorly on test data', 'Model performs poorly on all data', 'Model is too simple', 'Model has too few parameters'], correctOptionIndex: 0, explanation: 'Overfitting occurs when a model learns noise in training data rather than the pattern.' },
    ],
    'Cloud': [
        { text: 'What is IaaS?', options: ['Infrastructure as a Service', 'Internet as a Service', 'Integration as a System', 'Information and Analytics Suite'], correctOptionIndex: 0, explanation: 'IaaS provides virtualized computing resources over the internet.' },
        { text: 'Which of these is a cloud computing deployment model?', options: ['Private Cloud', 'Open Cloud', 'Closed Cloud', 'Linear Cloud'], correctOptionIndex: 0, explanation: 'Private, Public, Hybrid, and Community are the four deployment models.' },
        { text: 'What does AWS stand for?', options: ['Amazon Web Services', 'Advanced Web Systems', 'Automated Workflow Services', 'Application Web Suite'], correctOptionIndex: 0, explanation: 'AWS is Amazon\'s cloud computing platform.' },
        { text: 'What is serverless computing?', options: ['Computing without any servers', 'Cloud provider manages server infrastructure', 'Running code on local machines', 'Using only mobile devices'], correctOptionIndex: 1, explanation: 'Serverless means the cloud provider manages the infrastructure; developers focus on code.' },
        { text: 'What is auto-scaling?', options: ['Automatically adjusting resources based on demand', 'Manually increasing server count', 'Scaling down permanently', 'Upgrading hardware'], correctOptionIndex: 0, explanation: 'Auto-scaling dynamically adjusts resources to match current demand.' },
    ],
    'Cybersecurity': [
        { text: 'What is phishing?', options: ['A social engineering attack via deceptive emails', 'A type of firewall', 'A network protocol', 'A database encryption technique'], correctOptionIndex: 0, explanation: 'Phishing tricks users into revealing sensitive information through fake communications.' },
        { text: 'What does SSL/TLS provide?', options: ['Data encryption in transit', 'Database optimization', 'File compression', 'User authentication only'], correctOptionIndex: 0, explanation: 'SSL/TLS encrypts data transmitted between client and server.' },
        { text: 'What is a DDoS attack?', options: ['Distributed Denial of Service', 'Data Delivery of Systems', 'Direct Download of Software', 'Dynamic Domain of Security'], correctOptionIndex: 0, explanation: 'DDoS overwhelms a target with traffic from multiple sources to make it unavailable.' },
        { text: 'What is multi-factor authentication?', options: ['Using multiple verification methods to confirm identity', 'Using multiple passwords', 'Having multiple user accounts', 'Using multiple browsers'], correctOptionIndex: 0, explanation: 'MFA requires two or more verification factors, improving security.' },
        { text: 'Which of the following is a symmetric encryption algorithm?', options: ['RSA', 'AES', 'Diffie-Hellman', 'ECC'], correctOptionIndex: 1, explanation: 'AES (Advanced Encryption Standard) uses the same key for encryption and decryption.' },
    ],
    'React': [
        { text: 'What is the virtual DOM in React?', options: ['A lightweight copy of the real DOM', 'A database', 'A CSS framework', 'A testing tool'], correctOptionIndex: 0, explanation: 'The virtual DOM is an in-memory representation used for efficient updates.' },
        { text: 'What hook is used for state management in functional components?', options: ['useEffect', 'useState', 'useRef', 'useMemo'], correctOptionIndex: 1, explanation: 'useState allows functional components to manage local state.' },
        { text: 'What is JSX?', options: ['A syntax extension for JavaScript', 'A database query language', 'A CSS preprocessor', 'A testing framework'], correctOptionIndex: 0, explanation: 'JSX lets you write HTML-like syntax in JavaScript files.' },
        { text: 'What does useEffect hook do?', options: ['Manages side effects in components', 'Creates new components', 'Handles routing', 'Manages global state'], correctOptionIndex: 0, explanation: 'useEffect runs side effects like data fetching, subscriptions, or DOM manipulation.' },
        { text: 'What is prop drilling?', options: ['Passing props through multiple component levels', 'Drilling holes in the DOM', 'A performance optimization', 'A testing technique'], correctOptionIndex: 0, explanation: 'Prop drilling occurs when props are passed through many layers to reach a deeply nested component.' },
    ],
    'JavaScript': [
        { text: 'What is a closure in JavaScript?', options: ['A function with access to its outer scope', 'A way to close a browser window', 'A loop termination', 'A type of error'], correctOptionIndex: 0, explanation: 'A closure is a function that retains access to variables from its lexical scope.' },
        { text: 'What is the difference between let and var?', options: ['let is block-scoped, var is function-scoped', 'They are identical', 'var is block-scoped, let is function-scoped', 'let cannot be reassigned'], correctOptionIndex: 0, explanation: 'let has block scope while var has function scope.' },
        { text: 'What does async/await do?', options: ['Makes asynchronous code look synchronous', 'Speeds up code execution', 'Creates new threads', 'Compiles TypeScript'], correctOptionIndex: 0, explanation: 'Async/await is syntactic sugar over Promises for cleaner asynchronous code.' },
    ],
    'Python': [
        { text: 'What is a list comprehension?', options: ['A concise way to create lists', 'A way to sort lists', 'A method to delete list items', 'A list visualization tool'], correctOptionIndex: 0, explanation: 'List comprehensions provide a compact syntax for creating lists from iterables.' },
        { text: 'What is PEP 8?', options: ['Python Enhancement Proposal for code style', 'A Python package', 'A Python IDE', 'A Python version'], correctOptionIndex: 0, explanation: 'PEP 8 is the official style guide for Python code.' },
        { text: 'What does the __init__ method do?', options: ['Initializes a new object instance', 'Deletes an object', 'Imports a module', 'Creates a class'], correctOptionIndex: 0, explanation: '__init__ is the constructor method that initializes new instances of a class.' },
    ],
    'Teaching Pedagogy': [
        { text: 'What is Bloom\'s Taxonomy?', options: ['A framework for classifying educational objectives', 'A grading system', 'A teaching certification', 'A student assessment tool'], correctOptionIndex: 0, explanation: 'Bloom\'s Taxonomy categorizes learning objectives into hierarchical levels.' },
        { text: 'What is formative assessment?', options: ['Ongoing assessment during learning', 'Final exam only', 'Admission test', 'Peer review'], correctOptionIndex: 0, explanation: 'Formative assessment monitors student learning to provide ongoing feedback.' },
        { text: 'What is flipped classroom?', options: ['Students learn content at home and practice in class', 'Desks are rearranged', 'Students teach the class', 'Online-only learning'], correctOptionIndex: 0, explanation: 'In a flipped classroom, direct instruction moves online and class time is for active learning.' },
    ],
};

// --- Mock News Data (for Trends & Resources) ---
const MOCK_NEWS: Record<string, NewsArticle[]> = {
    'AI': [
        { title: 'GPT-5 Rumored to Launch Mid-2025 with Multimodal Capabilities', description: 'OpenAI is reportedly working on GPT-5, which will feature advanced reasoning and multimodal inputs including video understanding.', url: 'https://example.com/gpt5', source: 'TechCrunch', publishedAt: '2025-02-10', skillTag: 'AI' },
        { title: 'Google DeepMind Achieves Breakthrough in Protein Folding', description: 'AlphaFold 3 can now predict protein-ligand interactions with unprecedented accuracy.', url: 'https://example.com/alphafold3', source: 'Nature', publishedAt: '2025-02-08', skillTag: 'AI' },
        { title: 'EU AI Act: What Educators Need to Know', description: 'The European Union\'s AI Act takes effect, impacting how educational institutions use AI tools.', url: 'https://example.com/eu-ai-act', source: 'EdTech Magazine', publishedAt: '2025-02-05', skillTag: 'AI' },
        { title: 'Agentic AI: The Next Frontier Beyond Chatbots', description: 'AI agents that can plan, reason, and act autonomously are reshaping software development workflows.', url: 'https://example.com/agentic-ai', source: 'MIT Tech Review', publishedAt: '2025-02-01', skillTag: 'AI' },
    ],
    'Cloud': [
        { title: 'AWS Announces New Region in India for 2025', description: 'Amazon Web Services expands its footprint with a new availability zone in Hyderabad.', url: 'https://example.com/aws-india', source: 'AWS Blog', publishedAt: '2025-02-09', skillTag: 'Cloud' },
        { title: 'Kubernetes 1.30 Released with Enhanced Security Features', description: 'The latest Kubernetes release focuses on supply chain security and improved pod scheduling.', url: 'https://example.com/k8s', source: 'CNCF', publishedAt: '2025-02-06', skillTag: 'Cloud' },
        { title: 'Multi-Cloud Strategies: Best Practices for 2025', description: 'Organizations are increasingly adopting multi-cloud approaches to avoid vendor lock-in.', url: 'https://example.com/multicloud', source: 'InfoWorld', publishedAt: '2025-02-03', skillTag: 'Cloud' },
    ],
    'DBMS': [
        { title: 'PostgreSQL 17 Brings Columnar Storage and AI Vector Search', description: 'The latest PostgreSQL release includes built-in vector indexing for AI applications.', url: 'https://example.com/pg17', source: 'DB-Engines', publishedAt: '2025-02-07', skillTag: 'DBMS' },
        { title: 'Graph Databases vs Relational: When to Choose What', description: 'A comprehensive guide to selecting the right database paradigm for your application.', url: 'https://example.com/graph-vs-rdbms', source: 'DZone', publishedAt: '2025-02-04', skillTag: 'DBMS' },
        { title: 'NoSQL Trends: MongoDB 8.0 and Beyond', description: 'MongoDB introduces query engine improvements and enhanced time-series support.', url: 'https://example.com/mongodb8', source: 'MongoDB Blog', publishedAt: '2025-01-30', skillTag: 'DBMS' },
    ],
    'Cybersecurity': [
        { title: 'Zero-Day Vulnerabilities Hit Record High in 2024', description: 'Security researchers documented more zero-days than ever, driven by state-sponsored actors.', url: 'https://example.com/zeroday', source: 'Krebs on Security', publishedAt: '2025-02-10', skillTag: 'Cybersecurity' },
        { title: 'NIST Updates Cybersecurity Framework to Version 2.0', description: 'The updated framework adds governance as a core function and improves supply chain risk management.', url: 'https://example.com/nist', source: 'NIST', publishedAt: '2025-02-05', skillTag: 'Cybersecurity' },
        { title: 'Passkeys Replace Passwords: Industry-Wide Adoption Accelerates', description: 'Major platforms now support FIDO2 passkeys, marking a shift away from traditional passwords.', url: 'https://example.com/passkeys', source: 'Wired', publishedAt: '2025-02-02', skillTag: 'Cybersecurity' },
    ],
    'Teaching Pedagogy': [
        { title: 'AI-Assisted Grading: Opportunities and Ethical Considerations', description: 'How institutions are using AI for assessment while maintaining academic integrity.', url: 'https://example.com/ai-grading', source: 'Chronicle of Higher Education', publishedAt: '2025-02-08', skillTag: 'Teaching Pedagogy' },
        { title: 'Microlearning: Why Short-Form Content Works Better', description: 'Research shows 10-minute learning modules improve retention by 20% compared to hour-long lectures.', url: 'https://example.com/microlearning', source: 'eLearning Industry', publishedAt: '2025-02-04', skillTag: 'Teaching Pedagogy' },
        { title: 'Gamification in Higher Education: Case Studies from 2025', description: 'Universities report improved engagement through game-based learning strategies.', url: 'https://example.com/gamification', source: 'EDUCAUSE', publishedAt: '2025-01-28', skillTag: 'Teaching Pedagogy' },
    ],
};

export const api = {
    auth: {
        login: async (email: string, password: string): Promise<User> => {
            await delay(800);
            const users = db.users.getAll() as User[];
            const user = users.find((u) => u.email === email);
            if (!user) throw new Error('Invalid credentials');
            if (password !== 'Admin@123' && password !== 'Faculty@123') {
                throw new Error('Invalid credentials');
            }
            return user;
        },
        getUser: async (id: string): Promise<User | null> => {
            await delay(500);
            const users = db.users.getAll() as User[];
            return users.find((u) => u.id === id) || null;
        },
    },

    programs: {
        getAll: async (): Promise<Program[]> => {
            await delay(600);
            return db.programs.getAll();
        },
        getById: async (id: string): Promise<Program | undefined> => {
            await delay(400);
            const programs = db.programs.getAll() as Program[];
            return programs.find((p) => p.id === id);
        },
        create: async (program: Omit<Program, 'id' | 'enrolledCount' | 'status'>): Promise<Program> => {
            await delay(800);
            const programs = db.programs.getAll() as Program[];
            const newProgram: Program = {
                ...program,
                id: Math.random().toString(36).substr(2, 9),
                enrolledCount: 0,
                status: 'upcoming',
                topics: [],
                benefits: []
            };
            db.programs.set([...programs, newProgram]);
            return newProgram;
        },
        update: async (id: string, updates: Partial<Program>): Promise<Program> => {
            await delay(600);
            const programs = db.programs.getAll() as Program[];
            const index = programs.findIndex(p => p.id === id);
            if (index === -1) throw new Error("Program not found");
            const updated = { ...programs[index], ...updates };
            programs[index] = updated;
            db.programs.set(programs);
            return updated;
        },
        delete: async (id: string): Promise<void> => {
            await delay(600);
            const programs = db.programs.getAll() as Program[];
            db.programs.set(programs.filter((p) => p.id !== id));
        },
        enroll: async (userId: string, programId: string): Promise<void> => {
            await delay(600);
            const enrollments = db.enrollments.getAll() as Enrollment[];
            if (enrollments.some(e => e.userId === userId && e.programId === programId)) {
                throw new Error("Already enrolled");
            }
            const newEnrollment: Enrollment = {
                programId,
                userId,
                enrolledAt: new Date().toISOString(),
                status: 'enrolled',
            };
            db.enrollments.set([...enrollments, newEnrollment]);
            const programs = db.programs.getAll() as Program[];
            const programIndex = programs.findIndex(p => p.id === programId);
            if (programIndex >= 0) {
                programs[programIndex].enrolledCount += 1;
                db.programs.set(programs);
            }
        },
        getEnrollmentsByUser: async (userId: string): Promise<Enrollment[]> => {
            await delay(500);
            const enrollments = db.enrollments.getAll() as Enrollment[];
            return enrollments.filter(e => e.userId === userId);
        }
    },

    tests: {
        getAll: async (): Promise<Test[]> => {
            await delay(600);
            return db.tests.getAll();
        },
        getById: async (id: string): Promise<Test | undefined> => {
            await delay(400);
            const tests = db.tests.getAll() as Test[];
            return tests.find(t => t.id === id);
        },
        submitAttempt: async (attempt: TestAttempt): Promise<void> => {
            await delay(1000);
            const attempts = db.attempts.getAll() as TestAttempt[];
            db.attempts.set([...attempts, attempt]);
        },
        update: async (id: string, updates: Partial<Test>): Promise<Test> => {
            await delay(600);
            const tests = db.tests.getAll() as Test[];
            const index = tests.findIndex(t => t.id === id);
            if (index === -1) throw new Error("Test not found");
            const updated = { ...tests[index], ...updates };
            tests[index] = updated;
            db.tests.set(tests);
            return updated;
        },
        getAttemptsByUser: async (userId: string): Promise<TestAttempt[]> => {
            await delay(500);
            const attempts = db.attempts.getAll() as TestAttempt[];
            return attempts.filter(a => a.userId === userId);
        },
        create: async (test: Omit<Test, 'id' | 'createdDate'>): Promise<Test> => {
            await delay(800);
            const tests = db.tests.getAll() as Test[];
            const newTest: Test = {
                ...test,
                id: Math.random().toString(36).substr(2, 9),
                createdDate: new Date().toISOString()
            };
            db.tests.set([...tests, newTest]);
            return newTest;
        }
    },

    questionPacks: {
        getAll: async (filters?: { domain?: Domain; topic?: string; difficulty?: 'EASY' | 'MEDIUM' | 'HARD' }): Promise<QuestionPack[]> => {
            await delay(600);
            let packs = db.questionPacks.getAll() as QuestionPack[];
            if (filters) {
                if (filters.domain) packs = packs.filter(p => p.domain === filters.domain);
                if (filters.topic) packs = packs.filter(p => p.topic.toLowerCase().includes(filters.topic!.toLowerCase()));
                if (filters.difficulty) packs = packs.filter(p => p.difficulty === filters.difficulty);
            }
            return packs;
        },
        getById: async (id: string): Promise<QuestionPack | undefined> => {
            await delay(400);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            return packs.find(p => p.id === id);
        },
        create: async (pack: Omit<QuestionPack, 'id' | 'createdAt' | 'status' | 'questions'>): Promise<QuestionPack> => {
            await delay(800);
            if (!pack.domain) throw new Error("Domain is required");
            if (!pack.packName) throw new Error("Pack Name is required");

            const packs = db.questionPacks.getAll() as QuestionPack[];
            const newPack: QuestionPack = {
                ...pack,
                id: `pack_${Math.random().toString(36).substr(2, 9)}`,
                status: 'PUBLISHED',
                createdAt: new Date().toISOString(),
                publishedAt: new Date().toISOString(),
                questions: [],
            };
            db.questionPacks.set([...packs, newPack]);
            return newPack;
        },
        update: async (id: string, updates: Partial<QuestionPack>): Promise<QuestionPack> => {
            await delay(600);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            const index = packs.findIndex(p => p.id === id);
            if (index === -1) throw new Error("Pack not found");
            const updated = { ...packs[index], ...updates };
            packs[index] = updated;
            db.questionPacks.set(packs);
            return updated;
        },
        delete: async (id: string): Promise<void> => {
            await delay(600);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            db.questionPacks.set(packs.filter(p => p.id !== id));
        },
        addQuestion: async (packId: string, question: Omit<Question, 'id'>): Promise<Question> => {
            await delay(600);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            const packIdx = packs.findIndex(p => p.id === packId);
            if (packIdx === -1) throw new Error("Pack not found");

            const newQ: Question = {
                ...question,
                id: `q_${Math.random().toString(36).substr(2, 9)}`,
            };

            packs[packIdx].questions.push(newQ);
            db.questionPacks.set(packs);
            return newQ;
        },
        updateQuestion: async (packId: string, questionId: string, updates: Partial<Question>): Promise<Question> => {
            await delay(500);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            const packIdx = packs.findIndex(p => p.id === packId);
            if (packIdx === -1) throw new Error("Pack not found");

            const qIdx = packs[packIdx].questions.findIndex(q => q.id === questionId);
            if (qIdx === -1) throw new Error("Question not found in pack");

            const updatedQ = { ...packs[packIdx].questions[qIdx], ...updates };
            packs[packIdx].questions[qIdx] = updatedQ;
            db.questionPacks.set(packs);
            return updatedQ;
        },
        deleteQuestion: async (packId: string, questionId: string): Promise<void> => {
            await delay(500);
            const packs = db.questionPacks.getAll() as QuestionPack[];
            const packIdx = packs.findIndex(p => p.id === packId);
            if (packIdx === -1) throw new Error("Pack not found");

            packs[packIdx].questions = packs[packIdx].questions.filter(q => q.id !== questionId);
            db.questionPacks.set(packs);
        }
    },

    skills: {
        getAll: async (): Promise<FacultySkill[]> => {
            await delay(600);
            return db.skills.getAll();
        },
        getFacultySkills: async (facultyId: string): Promise<FacultySkill[]> => {
            await delay(400);
            const skills = db.skills.getAll() as FacultySkill[];
            return skills.filter(s => s.facultyId === facultyId);
        },
        add: async (skill: Omit<FacultySkill, 'id'>): Promise<FacultySkill> => {
            await delay(800);
            const skills = db.skills.getAll() as FacultySkill[];
            const newSkill = { ...skill, id: Math.random().toString(36).substr(2, 9) };
            db.skills.set([...skills, newSkill]);
            return newSkill;
        },
        update: async (id: string, updates: Partial<FacultySkill>): Promise<FacultySkill> => {
            await delay(600);
            const skills = db.skills.getAll() as FacultySkill[];
            const index = skills.findIndex(s => s.id === id);
            if (index === -1) throw new Error("Skill not found");
            const updatedSkill = { ...skills[index], ...updates };
            skills[index] = updatedSkill;
            db.skills.set(skills);
            return updatedSkill;
        },
        delete: async (id: string): Promise<void> => {
            await delay(500);
            const skills = db.skills.getAll() as FacultySkill[];
            db.skills.set(skills.filter(s => s.id !== id));
        },
        verifySkill: async (facultyId: string, skillId: string): Promise<FacultySkill> => {
            await delay(1000);
            const skills = db.skills.getAll() as FacultySkill[];
            const index = skills.findIndex(s => s.id === skillId && s.facultyId === facultyId);
            if (index === -1) throw new Error("Skill not found");

            // Skill verification logic based on practice sets and scores (handled by update)
            const updated = { ...skills[index], status: 'VERIFIED' as const };
            skills[index] = updated;
            db.skills.set(skills);
            return updated;
        }
    },

    // ─── AI Question Generator API ───
    questionDrafts: {
        generate: async (params: {
            topic: string;
            skill: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD';
            count: number;
            prompt: string;
        }): Promise<QuestionDraft> => {
            await delay(2500); // Simulate AI processing time

            const templates = QUESTION_TEMPLATES[params.topic] || QUESTION_TEMPLATES[params.skill] || QUESTION_TEMPLATES['React'];

            const generatedQuestions: DraftQuestion[] = [];
            for (let i = 0; i < params.count; i++) {
                const template = templates[i % templates.length];
                generatedQuestions.push({
                    id: `draft_q_${Math.random().toString(36).substr(2, 9)}`,
                    questionText: template.text,
                    options: {
                        A: template.options[0] || 'Option A',
                        B: template.options[1] || 'Option B',
                        C: template.options[2] || 'Option C',
                        D: template.options[3] || 'Option D',
                    },
                    correctOption: ['A', 'B', 'C', 'D'][template.correctOptionIndex] as 'A' | 'B' | 'C' | 'D',
                    explanation: template.explanation,
                    difficulty: params.difficulty,
                    topic: params.topic,
                    draftStatus: 'pending',
                });
            }

            const draft: QuestionDraft = {
                id: `draft_${Math.random().toString(36).substr(2, 9)}`,
                topic: params.topic,
                skill: params.skill,
                difficulty: params.difficulty,
                prompt: params.prompt,
                generatedQuestions,
                status: 'draft',
                createdAt: new Date().toISOString(),
            };

            const drafts = db.questionDrafts.getAll();
            db.questionDrafts.set([...drafts, draft]);
            return draft;
        },

        getAll: async (): Promise<QuestionDraft[]> => {
            await delay(500);
            return db.questionDrafts.getAll();
        },

        getById: async (id: string): Promise<QuestionDraft | undefined> => {
            await delay(300);
            const drafts = db.questionDrafts.getAll();
            return drafts.find(d => d.id === id);
        },

        updateQuestion: async (draftId: string, questionIndex: number, updates: Partial<DraftQuestion>): Promise<QuestionDraft> => {
            await delay(400);
            const drafts = db.questionDrafts.getAll();
            const draftIdx = drafts.findIndex(d => d.id === draftId);
            if (draftIdx === -1) throw new Error('Draft not found');
            const draft = { ...drafts[draftIdx] };
            draft.generatedQuestions = [...draft.generatedQuestions];
            draft.generatedQuestions[questionIndex] = { ...draft.generatedQuestions[questionIndex], ...updates };
            drafts[draftIdx] = draft;
            db.questionDrafts.set(drafts);
            return draft;
        },

        approveQuestion: async (draftId: string, questionIndex: number): Promise<QuestionDraft> => {
            await delay(300);
            const drafts = db.questionDrafts.getAll();
            const draftIdx = drafts.findIndex(d => d.id === draftId);
            if (draftIdx === -1) throw new Error('Draft not found');
            const draft = { ...drafts[draftIdx] };
            draft.generatedQuestions = [...draft.generatedQuestions];
            draft.generatedQuestions[questionIndex] = { ...draft.generatedQuestions[questionIndex], draftStatus: 'approved' };
            drafts[draftIdx] = draft;
            db.questionDrafts.set(drafts);
            return draft;
        },

        rejectQuestion: async (draftId: string, questionIndex: number): Promise<QuestionDraft> => {
            await delay(300);
            const drafts = db.questionDrafts.getAll();
            const draftIdx = drafts.findIndex(d => d.id === draftId);
            if (draftIdx === -1) throw new Error('Draft not found');
            const draft = { ...drafts[draftIdx] };
            draft.generatedQuestions = [...draft.generatedQuestions];
            draft.generatedQuestions[questionIndex] = { ...draft.generatedQuestions[questionIndex], draftStatus: 'rejected' };
            drafts[draftIdx] = draft;
            db.questionDrafts.set(drafts);
            return draft;
        },

        publishToPack: async (draftId: string, packConfig: {
            domain: Domain;
            packName: string;
            topic: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD';
            existingPackId?: string;
            description?: string;
        }): Promise<void> => {
            await delay(1200);
            const drafts = db.questionDrafts.getAll();
            const draftIdx = drafts.findIndex(d => d.id === draftId);
            if (draftIdx === -1) throw new Error('Draft not found');
            const draft = drafts[draftIdx];

            const approvedQs = draft.generatedQuestions.filter(q => q.draftStatus === 'approved');
            if (approvedQs.length === 0) throw new Error('No approved questions to publish');

            const packs = db.questionPacks.getAll() as QuestionPack[];
            let targetPack: QuestionPack;

            if (packConfig.existingPackId) {
                const existingIdx = packs.findIndex(p => p.id === packConfig.existingPackId);
                if (existingIdx === -1) throw new Error('Target pack not found');
                targetPack = packs[existingIdx];
                if (targetPack.domain !== packConfig.domain) throw new Error('Domain mismatch with existing pack');
            } else {
                targetPack = {
                    id: `pack_${Math.random().toString(36).substr(2, 9)}`,
                    packName: packConfig.packName,
                    domain: packConfig.domain,
                    topic: packConfig.topic,
                    difficulty: packConfig.difficulty,
                    description: packConfig.description,
                    status: 'PUBLISHED',
                    createdAt: new Date().toISOString(),
                    publishedAt: new Date().toISOString(),
                    createdBy: 'admin',
                    questions: [],
                };
                packs.push(targetPack);
            }

            // Map and add questions
            const newQuestions: Question[] = approvedQs.map(q => ({
                id: `q_${Math.random().toString(36).substr(2, 9)}`,
                questionText: q.questionText,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation,
                difficulty: q.difficulty,
                topic: q.topic,
                tags: q.tags
            }));

            // Prevent duplicates (simple text check)
            const existingTexts = new Set(targetPack.questions.map(q => q.questionText.toLowerCase().trim()));
            const nonDuplicateQs = newQuestions.filter(q => !existingTexts.has(q.questionText.toLowerCase().trim()));

            targetPack.questions.push(...nonDuplicateQs);
            db.questionPacks.set(packs);

            // Update draft status
            drafts[draftIdx] = {
                ...draft,
                status: 'published',
                approvedAt: new Date().toISOString(),
                approvedBy: 'admin',
            };
            db.questionDrafts.set(drafts);
        },

        delete: async (draftId: string): Promise<void> => {
            await delay(400);
            const drafts = db.questionDrafts.getAll();
            db.questionDrafts.set(drafts.filter(d => d.id !== draftId));
        },
    },

    // ─── Trends & Resources API ───
    trends: {
        getByTopic: async (topic: string): Promise<{ items: NewsArticle[]; lastFetchedAt: string; fromCache: boolean }> => {
            await delay(800);

            const CACHE_KEY = 'fsdp_news_cache';
            const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
            const stored = localStorage.getItem(CACHE_KEY);
            const cache = stored ? JSON.parse(stored) : {};

            if (cache[topic] && cache[topic].lastFetchedAt) {
                const age = Date.now() - new Date(cache[topic].lastFetchedAt).getTime();
                if (age < CACHE_TTL) {
                    return { items: cache[topic].items, lastFetchedAt: cache[topic].lastFetchedAt, fromCache: true };
                }
            }

            const articles = MOCK_NEWS[topic] || [];
            const now = new Date().toISOString();
            cache[topic] = { items: articles, lastFetchedAt: now };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

            return { items: articles, lastFetchedAt: now, fromCache: false };
        },

        refreshTopic: async (topic: string): Promise<{ items: NewsArticle[]; lastFetchedAt: string }> => {
            await delay(1200);
            const CACHE_KEY = 'fsdp_news_cache';
            const stored = localStorage.getItem(CACHE_KEY);
            const cache = stored ? JSON.parse(stored) : {};

            const articles = MOCK_NEWS[topic] || [];
            const now = new Date().toISOString();
            cache[topic] = { items: articles, lastFetchedAt: now };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

            return { items: articles, lastFetchedAt: now };
        },

        getTopics: async (): Promise<string[]> => {
            await delay(200);
            return ['AI', 'Cloud', 'DBMS', 'Cybersecurity', 'Teaching Pedagogy'];
        },
    },

    // ─── Career Goals & Growth Plans ───
    careerGoals: {
        getAll: async (): Promise<CareerGoal[]> => {
            await delay(500);
            return db.careerGoals.getAll();
        },
    },

    growthPlan: {
        getByUser: async (userId: string): Promise<GrowthPlan | null> => {
            await delay(400);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            return plans.find(p => p.facultyId === userId && p.status === 'ACTIVE') || null;
        },
        setup: async (plan: Omit<GrowthPlan, 'id' | 'progressPercentage' | 'status' | 'roadmapWeeks'>): Promise<GrowthPlan> => {
            await delay(2000); // AI generation time

            const weeks = 10; // Defaulting to 10 weeks
            const roadmapWeeks: RoadmapWeek[] = [];

            for (let i = 1; i <= weeks; i++) {
                roadmapWeeks.push({
                    weekNumber: i,
                    topics: [`${plan.skill} Phase ${i}`, `Applied ${plan.domain} Concepts`],
                    requiredPracticeCount: i % 3 === 0 ? 3 : 2,
                    completedPracticeCount: 0,
                    requiredMinAvgScore: 70 + (i * 2),
                    avgScoreForWeek: 0,
                    taskDescription: `Master the advanced principles of ${plan.skill} through structured practice and conceptual review for week ${i}.`,
                    tasks: [
                        { id: `t_${i}_1`, label: `Complete ${plan.skill} core concepts module`, done: false },
                        { id: `t_${i}_2`, label: `Apply ${plan.domain} patterns in practice`, done: false }
                    ],
                    completed: false
                });
            }

            const newPlan: GrowthPlan = {
                ...plan,
                id: `plan_${Math.random().toString(36).substr(2, 9)}`,
                roadmapWeeks,
                progressPercentage: 0,
                status: 'ACTIVE',
            };

            const plans = db.growthPlans.getAll() as GrowthPlan[];
            // Archive existing active plans for this faculty
            const updatedPlans = plans.map(p =>
                (p.facultyId === plan.facultyId && p.status === 'ACTIVE')
                    ? { ...p, status: 'ARCHIVED' as const }
                    : p
            );

            db.growthPlans.set([...updatedPlans, newPlan]);
            return newPlan;
        },
        reset: async (planId: string): Promise<void> => {
            await delay(500);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            const updatedPlans = plans.map(p =>
                p.id === planId ? { ...p, status: 'ARCHIVED' as const } : p
            );
            db.growthPlans.set(updatedPlans);
        },
        hardReset: async (facultyId: string): Promise<void> => {
            await delay(800);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            const updatedPlans = plans.map(p =>
                (p.facultyId === facultyId && p.status === 'ACTIVE')
                    ? { ...p, status: 'ARCHIVED' as const }
                    : p
            );
            db.growthPlans.set(updatedPlans);
        },
        updateWeek: async (planId: string, weekNumber: number, completed: boolean): Promise<GrowthPlan> => {
            await delay(500);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            const planIdx = plans.findIndex(p => p.id === planId);
            if (planIdx === -1) throw new Error('Plan not found');

            const plan = plans[planIdx];
            const weekIdx = plan.roadmapWeeks.findIndex(w => w.weekNumber === weekNumber);
            if (weekIdx === -1) throw new Error('Week not found');

            plan.roadmapWeeks[weekIdx].completed = completed;
            if (completed) {
                plan.roadmapWeeks[weekIdx].completedAt = new Date().toISOString();
            } else {
                delete plan.roadmapWeeks[weekIdx].completedAt;
            }

            // Recalculate overall progress
            const completedWeeks = plan.roadmapWeeks.filter(w => w.completed).length;
            plan.progressPercentage = Math.round((completedWeeks / plan.roadmapWeeks.length) * 100);

            db.growthPlans.set(plans);
            return plan;
        },
        completeWeek: async (planId: string, weekNumber: number): Promise<GrowthPlan> => {
            await delay(800);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            const planIdx = plans.findIndex(p => p.id === planId);
            if (planIdx === -1) throw new Error('Plan not found');

            const plan = plans[planIdx];
            const weekIdx = plan.roadmapWeeks.findIndex(w => w.weekNumber === weekNumber);
            if (weekIdx === -1) throw new Error('Week not found');

            const week = plan.roadmapWeeks[weekIdx];

            // Validation (could also be done on frontend, but good to have here)
            const allTasksDone = week.tasks.every(t => t.done);
            if (week.completedPracticeCount < week.requiredPracticeCount) {
                throw new Error(`Insufficient practice tests: ${week.completedPracticeCount}/${week.requiredPracticeCount}`);
            }
            if (week.avgScoreForWeek < week.requiredMinAvgScore) {
                throw new Error(`Average score too low: ${week.avgScoreForWeek}/${week.requiredMinAvgScore}`);
            }
            if (!allTasksDone) {
                throw new Error('All tasks must be completed');
            }

            week.completed = true;
            week.completedAt = new Date().toISOString();

            // Recalculate overall progress
            const completedWeeks = plan.roadmapWeeks.filter(w => w.completed).length;
            plan.progressPercentage = Math.round((completedWeeks / plan.roadmapWeeks.length) * 100);

            db.growthPlans.set(plans);
            return plan;
        },
        toggleTask: async (planId: string, weekNumber: number, taskId: string): Promise<GrowthPlan> => {
            await delay(300);
            const plans = db.growthPlans.getAll() as GrowthPlan[];
            const planIdx = plans.findIndex(p => p.id === planId);
            if (planIdx === -1) throw new Error('Plan not found');

            const plan = plans[planIdx];
            const weekIdx = plan.roadmapWeeks.findIndex(w => w.weekNumber === weekNumber);
            const taskIdx = plan.roadmapWeeks[weekIdx].tasks.findIndex(t => t.id === taskId);

            plan.roadmapWeeks[weekIdx].tasks[taskIdx].done = !plan.roadmapWeeks[weekIdx].tasks[taskIdx].done;

            db.growthPlans.set(plans);
            return plan;
        }
    },

    admin: {
        createFaculty: async (userData: Omit<User, 'id' | 'role' | 'joinedDate' | 'apiToken'>): Promise<User> => {
            await delay(800);
            const users = db.users.getAll() as User[];

            // Check for existing email
            if (users.some(u => u.email === userData.email)) {
                throw new Error('User with this email already exists');
            }

            const newUser: User = {
                ...userData,
                id: Math.random().toString(36).substr(2, 9),
                role: 'faculty',
                joinedDate: new Date().toISOString().split('T')[0],
                apiToken: `faculty-token-${Math.random().toString(36).substr(2, 9)}`,
            };

            db.users.set([...users, newUser]);

            // Initialize empty skills for the new faculty if needed
            // Initialize empty performance record
            const performance = db.performance.getAll() as FacultyPerformanceDetail[];
            const newPerformance: FacultyPerformanceDetail = {
                facultyId: newUser.id,
                skillHeatmap: {},
                practiceHistory: [],
                weakestTopics: [],
                riskIndicators: [],
                careerProbability: 50, // Default starting probability
                aiSummary: 'New faculty member. No performance data available yet.'
            };
            db.performance.set([...performance, newPerformance]);

            return newUser;
        },
        listFaculty: async (): Promise<User[]> => {
            await delay(600);
            return db.users.getAll().filter(u => u.role === 'faculty');
        },
        getFacultyAnalytics: async () => {
            await delay(800);
            const facultyList = db.users.getAll().filter(u => u.role === 'faculty');
            const allAttempts = db.attempts.getAll() as TestAttempt[];
            const allPracticeSets = db.aiPracticeSets.getAll() as AIPracticeSet[];
            const allSkills = db.skills.getAll() as FacultySkill[];
            const allPlans = db.growthPlans.getAll() as GrowthPlan[];

            return facultyList.map(faculty => {
                const facultyAttempts = allAttempts.filter(a => a.userId === faculty.id);
                const facultyPractice = allPracticeSets.filter(s => s.facultyId === faculty.id && s.result);
                const facultySkills = allSkills.filter(s => s.facultyId === faculty.id);
                const facultyPlan = allPlans.find(p => p.facultyId === faculty.id && p.status === 'ACTIVE');

                const totalAttempts = facultyAttempts.length + facultyPractice.length;
                const avgAccuracy = totalAttempts > 0
                    ? Math.round((
                        facultyAttempts.reduce((acc, a) => acc + (a.score / a.totalQuestions * 100), 0) +
                        facultyPractice.reduce((acc, s) => acc + (s.result?.accuracy || 0), 0)
                    ) / totalAttempts)
                    : 0;

                // Calculate career probability (mock calculation based on activity and accuracy)
                const careerProbability = Math.min(95, Math.max(20, avgAccuracy + (totalAttempts * 2)));

                // Determine risk indicators
                const riskIndicators: { severity: 'HIGH' | 'MEDIUM' | 'LOW', message: string }[] = [];
                if (totalAttempts < 5) {
                    riskIndicators.push({ severity: 'MEDIUM', message: 'Low engagement: Fewer than 5 assessments' });
                }
                if (avgAccuracy < 60 && totalAttempts > 0) {
                    riskIndicators.push({ severity: 'HIGH', message: 'Below 60% average accuracy' });
                }
                if (!facultyPlan) {
                    riskIndicators.push({ severity: 'LOW', message: 'No active growth plan' });
                }

                return {
                    ...faculty,
                    analytics: {
                        careerProbability,
                        riskIndicators
                    }
                };
            });
        },
        getFacultyPerformanceSummary: async (facultyId: string) => {
            await delay(800);
            const attempts = (db.attempts.getAll() as TestAttempt[]).filter(a => a.userId === facultyId);
            const practiceSets = (db.aiPracticeSets.getAll() as AIPracticeSet[]).filter(s => s.facultyId === facultyId && s.result);
            const skills = (db.skills.getAll() as FacultySkill[]).filter(s => s.facultyId === facultyId);
            const plans = (db.growthPlans.getAll() as GrowthPlan[]).filter(p => p.facultyId === facultyId && p.status === 'ACTIVE');

            const totalAttempts = attempts.length + practiceSets.length;
            const avgAccuracy = totalAttempts > 0
                ? Math.round((attempts.reduce((acc, a) => acc + (a.score / a.totalQuestions * 100), 0) + practiceSets.reduce((acc, s) => acc + (s.result?.accuracy || 0), 0)) / totalAttempts)
                : 0;

            const lastActive = [...attempts.map(a => a.date), ...practiceSets.map(s => s.result!.submittedAt)].sort().reverse()[0];

            // Domain analysis
            const domainScores: Record<string, { total: number, count: number }> = {};
            attempts.forEach(a => {
                const test = (db.tests.getAll() as Test[]).find(t => t.id === a.testId);
                if (test) {
                    if (!domainScores[test.domain]) domainScores[test.domain] = { total: 0, count: 0 };
                    domainScores[test.domain].total += (a.score / a.totalQuestions * 100);
                    domainScores[test.domain].count++;
                }
            });
            practiceSets.forEach(s => {
                if (!domainScores[s.domain]) domainScores[s.domain] = { total: 0, count: 0 };
                domainScores[s.domain].total += (s.result?.accuracy || 0);
                domainScores[s.domain].count++;
            });

            const domains = Object.entries(domainScores).map(([name, stats]) => ({
                name,
                avg: Math.round(stats.total / stats.count)
            })).sort((a, b) => b.avg - a.avg);

            return {
                avgAccuracy,
                totalAttempts,
                lastActiveDate: lastActive || 'Never',
                strongestDomain: domains[0]?.name || 'N/A',
                weakestDomain: domains[domains.length - 1]?.name || 'N/A',
                activePlan: plans[0] || null,
                verifiedSkillsCount: skills.filter(s => s.status === 'VERIFIED').length,
                unverifiedSkillsCount: skills.filter(s => s.status === 'SELF_DECLARED').length
            };
        },
        getFacultyAttempts: async (facultyId: string, filters?: { domain?: Domain }) => {
            await delay(600);
            let attempts = (db.attempts.getAll() as TestAttempt[]).filter(a => a.userId === facultyId);
            const tests = db.tests.getAll() as Test[];

            let combined = attempts.map(a => {
                const test = tests.find(t => t.id === a.testId);
                return { ...a, testTitle: test?.title, domain: test?.domain };
            });

            if (filters?.domain) {
                combined = combined.filter(a => a.domain === filters.domain);
            }

            return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        getFacultySkillBreakdown: async (facultyId: string) => {
            await delay(500);
            return (db.skills.getAll() as FacultySkill[]).filter(s => s.facultyId === facultyId);
        },
        exportFacultyPerformanceCSV: async (facultyId: string): Promise<string> => {
            await delay(1000);
            const summary = await api.admin.getFacultyPerformanceSummary(facultyId);
            const attempts = await api.admin.getFacultyAttempts(facultyId);
            const skills = await api.admin.getFacultySkillBreakdown(facultyId);

            let csv = "Faculty Performance Report\n";
            csv += `Average Accuracy,${summary.avgAccuracy}%\n`;
            csv += `Total Attempts,${summary.totalAttempts}\n`;
            csv += `Strongest Domain,${summary.strongestDomain}\n\n`;

            csv += "Attempts History\nDate,Test,Domain,Score,Accuracy\n";
            attempts.forEach(a => {
                csv += `${a.date},${a.testTitle},${a.domain},${a.score}/${a.totalQuestions},${Math.round(a.score / a.totalQuestions * 100)}%\n`;
            });

            csv += "\nSkill Breakdown\nSkill,Level,Status\n";
            skills.forEach(s => {
                csv += `${s.name},${s.level},${s.status}\n`;
            });

            return csv;
        }
    },

    aiPractice: {
        generateSet: async (params: {
            facultyId: string;
            domain: Domain;
            topic?: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD';
            count: number;
            source: 'WEAKNESS' | 'CUSTOM' | 'PACK';
        }): Promise<AIPracticeSet> => {
            await delay(2000);

            const packs = db.questionPacks.getAll() as QuestionPack[];
            const domainPacks = packs.filter(p => p.domain === params.domain);

            let sourceQuestions: Question[] = [];
            if (params.source === 'PACK' && params.topic) {
                sourceQuestions = domainPacks.filter(p => p.topic === params.topic).flatMap(p => p.questions);
            } else if (params.source === 'WEAKNESS') {
                // In a real app we'd look at wrong answers; here we take from domain packs
                sourceQuestions = domainPacks.flatMap(p => p.questions);
            } else {
                sourceQuestions = domainPacks.flatMap(p => p.questions);
            }

            // Fallback to templates if needed (Option 1 says prefer packs, but we need enough Qs)
            if (sourceQuestions.length < params.count) {
                const templates = QUESTION_TEMPLATES[params.domain] || QUESTION_TEMPLATES['AI'];
                templates.forEach((t, i) => {
                    sourceQuestions.push({
                        id: `temp_${i}`,
                        questionText: t.text,
                        options: { A: t.options[0], B: t.options[1], C: t.options[2], D: t.options[3] },
                        correctOption: ['A', 'B', 'C', 'D'][t.correctOptionIndex] as any,
                        explanation: t.explanation,
                        difficulty: params.difficulty,
                        topic: params.topic || params.domain
                    });
                });
            }

            // Shuffle and pick
            const shuffled = sourceQuestions.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, params.count);

            const practiceQuestions: PracticeQuestion[] = selected.map(q => ({
                ...q,
                id: `pq_${Math.random().toString(36).substr(2, 5)}`,
                generatedForPractice: true,
                basedOnQuestionId: q.id
            }));

            const newSet: AIPracticeSet = {
                id: `aset_${Math.random().toString(36).substr(2, 9)}`,
                facultyId: params.facultyId,
                domain: params.domain,
                topic: params.topic,
                difficulty: params.difficulty,
                source: params.source,
                createdAt: new Date().toISOString(),
                questions: practiceQuestions
            };

            const allSets = db.aiPracticeSets.getAll();
            db.aiPracticeSets.set([...allSets, newSet]);
            return newSet;
        },

        submitResult: async (setId: string, result: { score: number; accuracy: number }): Promise<void> => {
            await delay(800);
            const sets = db.aiPracticeSets.getAll() as AIPracticeSet[];
            const setIdx = sets.findIndex(s => s.id === setId);
            if (setIdx === -1) throw new Error('Practice set not found');

            const set = sets[setIdx];
            set.result = { ...result, submittedAt: new Date().toISOString() };
            db.aiPracticeSets.set(sets);

            // Update Faculty Stats & Skill Logic
            const performances = db.performance.getAll() as FacultyPerformanceDetail[];
            const perfIdx = performances.findIndex(p => p.facultyId === set.facultyId);

            if (perfIdx !== -1) {
                const perf = performances[perfIdx];
                perf.practiceHistory.push({
                    date: set.result.submittedAt,
                    score: result.score,
                    isAIPractice: true
                });

                // Update AI Practice stats
                const aiSets = sets.filter(s => s.facultyId === set.facultyId && s.result);
                perf.aiPracticeStats = {
                    totalSetsCompleted: aiSets.length,
                    averageAccuracy: Math.round(aiSets.reduce((acc, s) => acc + (s.result?.accuracy || 0), 0) / aiSets.length),
                    topWeakDomains: perf.aiPracticeStats?.topWeakDomains || []
                };

                db.performance.set(performances);

                // Skill Validation Increment
                if (result.score >= 70 && (set.source === 'PACK' || set.source === 'WEAKNESS')) {
                    const skills = db.skills.getAll() as FacultySkill[];
                    // Logic to find relevant skill by domain/topic
                    const skillIdx = skills.findIndex(s => s.name.toLowerCase().includes(set.domain.toLowerCase()));
                    if (skillIdx !== -1 && skills[skillIdx].status === 'SELF_DECLARED') {
                        const sk = skills[skillIdx];
                        if (sk.verificationProgress) {
                            sk.verificationProgress.practiceTestsCompleted += 1;
                            if (sk.verificationProgress.practiceTestsCompleted >= sk.verificationProgress.requiredPracticeTests) {
                                // Potentially unlock final assessment or verify if it's already done
                            }
                            db.skills.set(skills);
                        }
                    }
                }
            }
        },

        getSetsByUser: async (userId: string): Promise<AIPracticeSet[]> => {
            await delay(500);
            const sets = db.aiPracticeSets.getAll() as AIPracticeSet[];
            return sets.filter(s => s.facultyId === userId);
        }
    }
};
