"""
Seed Courses Script
Run from the `server` directory:
    python seed_courses.py
"""
import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select

from app.core.config import settings
from app.models.user import User
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_quiz import ModuleQuiz
from app.models.course_assessment import CourseAssessmentQuestion
from app.models.discussion import Discussion, DiscussionReply


COURSES_DATA = [
    {
        "title": "Artificial Intelligence for Educators",
        "description": "A comprehensive guide to understanding and applying AI technologies in modern education. Learn to leverage AI tools for smarter teaching, personalized learning, and automated assessments.",
        "instructor_name": "Dr. Priya Sharma",
        "duration_hours": 8.0,
        "skill_level": "beginner",
        "tags": ["AI", "Teaching", "Technology"],
        "thumbnail_url": "https://images.unsplash.com/photo-1677691820099-a6e8040aa077?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "What is Artificial Intelligence?",
                "description": "Introduction to AI concepts, history, and key terminology every educator needs to know.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=2ePf9rue1Ao",
                "video_duration_seconds": 900,
                "notes_url": None,
                "key_takeaways": [
                    "AI is not just robots — it includes machine learning, NLP, and computer vision.",
                    "AI tools are already embedded in tools we use daily (Google, Grammarly, Zoom).",
                    "Understanding AI helps educators stay ahead in curriculum design.",
                ],
                "quiz": [
                    {
                        "question_text": "What does 'AI' stand for?",
                        "options": {"A": "Automated Intelligence", "B": "Artificial Intelligence", "C": "Augmented Interface", "D": "Algorithmic Integration"},
                        "correct_answer": "B",
                        "explanation": "AI stands for Artificial Intelligence — the simulation of human intelligence by machines.",
                    },
                    {
                        "question_text": "Which of the following is a subfield of AI?",
                        "options": {"A": "Database Management", "B": "Web Development", "C": "Machine Learning", "D": "Networking"},
                        "correct_answer": "C",
                        "explanation": "Machine Learning is a subfield of AI focused on learning from data.",
                    },
                ],
            },
            {
                "title": "AI Tools for Teaching",
                "description": "Practical exploration of AI tools that help with lesson planning, grading, and student engagement.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=hfIUstzHs9A",
                "video_duration_seconds": 720,
                "notes_url": None,
                "key_takeaways": [
                    "ChatGPT and similar tools can assist with content creation and quiz generation.",
                    "AI-powered grading tools reduce repetitive work for educators.",
                    "Ethical use of AI in education requires transparency with students.",
                ],
                "quiz": [
                    {
                        "question_text": "Which AI tool is commonly used to generate quiz questions?",
                        "options": {"A": "Figma", "B": "ChatGPT", "C": "Photoshop", "D": "Excel"},
                        "correct_answer": "B",
                        "explanation": "ChatGPT is widely used by educators to generate quiz questions and lesson plans.",
                    },
                ],
            },
            {
                "title": "Ethical Considerations in AI",
                "description": "Explore the ethical implications of using AI in educational settings, including privacy, bias, and equity.",
                "order_index": 2,
                "video_url": "https://www.youtube.com/watch?v=aR5N2Jl8k14",
                "video_duration_seconds": 600,
                "notes_url": None,
                "key_takeaways": [
                    "AI systems can perpetuate bias if trained on unrepresentative data.",
                    "Student data privacy must be protected when using AI tools.",
                    "Educators have a responsibility to understand the tools they use.",
                ],
                "quiz": [],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "Which of the following is NOT a branch of Artificial Intelligence?",
                "options": {"A": "Natural Language Processing", "B": "Computer Vision", "C": "Blockchain", "D": "Robotics"},
                "correct_answer": "C",
            },
            {
                "question_text": "What is the primary goal of using AI in education?",
                "options": {"A": "Replace teachers", "B": "Personalize learning experiences", "C": "Reduce school budgets", "D": "Eliminate textbooks"},
                "correct_answer": "B",
            },
        ],
    },
    {
        "title": "Python Programming for Academic Research",
        "description": "Learn Python programming from scratch with a focus on data analysis, visualization, and automation tasks that are highly relevant to academic research and reporting.",
        "instructor_name": "Prof. Arjun Nair",
        "duration_hours": 12.0,
        "skill_level": "beginner",
        "tags": ["Python", "Research", "Data Science"],
        "thumbnail_url": "https://images.unsplash.com/photo-1753545975907-dcb51efdd0d5?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "Getting Started with Python",
                "description": "Install Python, set up your IDE, and write your first Python script.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
                "video_duration_seconds": 1200,
                "notes_url": None,
                "key_takeaways": [
                    "Python is beginner-friendly and widely used in research.",
                    "Jupyter Notebooks are ideal for combining code, data, and narrative text.",
                    "Python libraries like NumPy, Pandas, and Matplotlib are essential for research.",
                ],
                "quiz": [
                    {
                        "question_text": "Which command prints output in Python?",
                        "options": {"A": "echo()", "B": "console.log()", "C": "print()", "D": "output()"},
                        "correct_answer": "C",
                        "explanation": "In Python, the print() function outputs text to the console.",
                    },
                ],
            },
            {
                "title": "Data Analysis with Pandas",
                "description": "Use the Pandas library to load, clean, and analyze research datasets efficiently.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=vmEHCJofslg",
                "video_duration_seconds": 1800,
                "notes_url": None,
                "key_takeaways": [
                    "DataFrames are the core data structure in Pandas.",
                    "Use df.head(), df.describe() to quickly understand your dataset.",
                    "Missing data can be handled with dropna() or fillna().",
                ],
                "quiz": [
                    {
                        "question_text": "What does the Pandas library primarily deal with?",
                        "options": {"A": "Image processing", "B": "Data manipulation and analysis", "C": "Web scraping", "D": "Machine learning"},
                        "correct_answer": "B",
                        "explanation": "Pandas is a data manipulation and analysis library for Python.",
                    },
                ],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "What is the correct syntax to import a library in Python?",
                "options": {"A": "include library_name", "B": "require library_name", "C": "import library_name", "D": "use library_name"},
                "correct_answer": "C",
            },
            {
                "question_text": "Which Python library is best for data visualization?",
                "options": {"A": "NumPy", "B": "Requests", "C": "Matplotlib", "D": "Flask"},
                "correct_answer": "C",
            },
        ],
    },
    {
        "title": "Cloud Computing Fundamentals",
        "description": "Understand cloud computing concepts, deployment models, and how cloud services (AWS, Azure, Google Cloud) can be leveraged for academic and institutional IT infrastructure.",
        "instructor_name": "Dr. Kavitha Menon",
        "duration_hours": 6.0,
        "skill_level": "intermediate",
        "tags": ["Cloud", "Technology", "Infrastructure"],
        "thumbnail_url": "https://images.unsplash.com/photo-1717501219263-1c7f7d4cb97d?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "Introduction to Cloud Computing",
                "description": "Core concepts: IaaS, PaaS, SaaS, public vs private vs hybrid cloud.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=M988_fsOSWo",
                "video_duration_seconds": 900,
                "notes_url": None,
                "key_takeaways": [
                    "Cloud computing delivers computing services over the internet on demand.",
                    "The three service models are IaaS, PaaS, and SaaS.",
                    "Cloud reduces capital expenditure and increases flexibility.",
                ],
                "quiz": [
                    {
                        "question_text": "What does 'SaaS' stand for?",
                        "options": {"A": "Software as a Service", "B": "Storage as a Service", "C": "Server as a Service", "D": "Security as a Service"},
                        "correct_answer": "A",
                        "explanation": "SaaS stands for Software as a Service — software delivered via the internet.",
                    },
                ],
            },
            {
                "title": "AWS for Researchers",
                "description": "Practical introduction to Amazon Web Services and how researchers can use it for data storage, computing, and collaboration.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=3hLmDS179YE",
                "video_duration_seconds": 1500,
                "notes_url": None,
                "key_takeaways": [
                    "AWS S3 is ideal for storing research datasets securely.",
                    "EC2 instances provide scalable computing power for analysis tasks.",
                    "AWS Free Tier allows beginners to explore services at no cost.",
                ],
                "quiz": [],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "Which cloud service model provides the most control over the underlying infrastructure?",
                "options": {"A": "SaaS", "B": "PaaS", "C": "IaaS", "D": "FaaS"},
                "correct_answer": "C",
            },
            {
                "question_text": "What is a primary advantage of cloud computing?",
                "options": {"A": "Requires no internet connection", "B": "Scales resources on demand", "C": "Always cheaper than on-premise", "D": "Completely immune to data breaches"},
                "correct_answer": "B",
            },
        ],
    },
    {
        "title": "Effective Research Methodology",
        "description": "A structured approach to academic research — from formulating research questions and selecting methodologies to data collection, analysis, and ethical reporting.",
        "instructor_name": "Dr. Meera Pillai",
        "duration_hours": 10.0,
        "skill_level": "intermediate",
        "tags": ["Research", "Methodology", "Academic Writing"],
        "thumbnail_url": "https://images.unsplash.com/photo-1764096535068-0e9f652e03f6?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "Designing a Research Framework",
                "description": "How to define research objectives, formulate hypotheses, and choose appropriate methodologies.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=b3VgC2WlNUQ",
                "video_duration_seconds": 1080,
                "notes_url": None,
                "key_takeaways": [
                    "A clear research question is the foundation of any successful study.",
                    "Qualitative and quantitative methods serve different research goals.",
                    "Triangulation improves the validity of research findings.",
                ],
                "quiz": [
                    {
                        "question_text": "What is the first step in the research process?",
                        "options": {"A": "Data collection", "B": "Literature review", "C": "Identifying a research problem", "D": "Publishing findings"},
                        "correct_answer": "C",
                        "explanation": "The first step is identifying and clearly defining the research problem.",
                    },
                ],
            },
            {
                "title": "Literature Review Best Practices",
                "description": "How to search, evaluate, and synthesize academic literature effectively.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=VeGF5a7cbH4",
                "video_duration_seconds": 780,
                "notes_url": None,
                "key_takeaways": [
                    "Use databases like Google Scholar, PubMed, and Scopus for reliable sources.",
                    "A good literature review identifies gaps in existing knowledge.",
                    "Proper citation prevents plagiarism and gives credit to original authors.",
                ],
                "quiz": [],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "Which of the following is an example of qualitative research?",
                "options": {"A": "Conducting a survey with numerical ratings", "B": "In-depth interviews exploring participants' lived experiences", "C": "Statistical analysis of census data", "D": "A randomized controlled trial"},
                "correct_answer": "B",
            },
        ],
    },
    {
        "title": "Modern Teaching Strategies for Higher Education",
        "description": "Explore evidence-based teaching strategies including active learning, flipped classroom models, case-based instruction, and technology-enhanced pedagogy tailored for university educators.",
        "instructor_name": "Prof. Sunita Rao",
        "duration_hours": 7.0,
        "skill_level": "beginner",
        "tags": ["Teaching", "Pedagogy", "Higher Education"],
        "thumbnail_url": "https://images.unsplash.com/photo-1649920442906-3c8ef428fb6e?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "Active Learning Techniques",
                "description": "Move beyond lecture-only formats to interactive learning experiences that boost student engagement.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=R2hb_BT-MxM",
                "video_duration_seconds": 840,
                "notes_url": None,
                "key_takeaways": [
                    "Think-pair-share and group problem solving increase student retention.",
                    "Regular low-stakes quizzes (retrieval practice) improve long-term learning.",
                    "Active learning reduces the achievement gap between students.",
                ],
                "quiz": [
                    {
                        "question_text": "What is 'retrieval practice'?",
                        "options": {"A": "Re-reading notes before an exam", "B": "Actively recalling information from memory", "C": "Watching lecture recordings", "D": "Group projects"},
                        "correct_answer": "B",
                        "explanation": "Retrieval practice involves actively recalling learned information, which strengthens memory.",
                    },
                ],
            },
            {
                "title": "The Flipped Classroom Model",
                "description": "Learn how to restructure your course so students engage with content at home and apply it in class.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=iMZA80XpP6Y",
                "video_duration_seconds": 720,
                "notes_url": None,
                "key_takeaways": [
                    "In a flipped classroom, lectures are moved online (video), freeing class time for application.",
                    "Students come to class better prepared, enabling deeper discussions.",
                    "Tools like Edpuzzle, Peergrade, and Canvas support flipped instruction.",
                ],
                "quiz": [],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "In a flipped classroom model, what happens during class time?",
                "options": {"A": "Students watch lecture videos", "B": "Teacher delivers traditional lecture", "C": "Students apply knowledge through activities and discussions", "D": "Exams are conducted"},
                "correct_answer": "C",
            },
        ],
    },
    {
        "title": "Data Science for Academic Decision Making",
        "description": "An advanced course on using data science techniques — statistical modeling, machine learning, and dashboards — to inform institutional decisions, policy-making, and educational research.",
        "instructor_name": "Dr. Vijay Kumar",
        "duration_hours": 15.0,
        "skill_level": "advanced",
        "tags": ["Data Science", "Analytics", "AI", "Research"],
        "thumbnail_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
        "is_published": True,
        "modules": [
            {
                "title": "Statistical Modeling for Researchers",
                "description": "Use statistical models (regression, ANOVA, chi-square) to draw meaningful conclusions from your research data.",
                "order_index": 0,
                "video_url": "https://www.youtube.com/watch?v=zITIFTsivN8",
                "video_duration_seconds": 1800,
                "notes_url": None,
                "key_takeaways": [
                    "Choose your statistical test based on data type and research question.",
                    "p-value < 0.05 is commonly used as the threshold for statistical significance.",
                    "Effect size matters as much as statistical significance.",
                ],
                "quiz": [
                    {
                        "question_text": "Which statistical test compares the means of two groups?",
                        "options": {"A": "Chi-square test", "B": "Correlation analysis", "C": "T-test", "D": "Factor analysis"},
                        "correct_answer": "C",
                        "explanation": "The t-test is used to compare the means of two groups.",
                    },
                ],
            },
            {
                "title": "Building Dashboards with Python",
                "description": "Create interactive dashboards using Plotly and Dash to visualize institutional data for decision-makers.",
                "order_index": 1,
                "video_url": "https://www.youtube.com/watch?v=hSPmj7mK6ng",
                "video_duration_seconds": 2400,
                "notes_url": None,
                "key_takeaways": [
                    "Plotly Express makes it easy to create interactive charts from DataFrames.",
                    "Dash allows building web-based dashboards with pure Python.",
                    "Effective data visualization communicates insights faster than tables.",
                ],
                "quiz": [],
            },
            {
                "title": "Intro to Machine Learning in Research",
                "description": "Apply supervised and unsupervised ML algorithms to research problems using scikit-learn.",
                "order_index": 2,
                "video_url": "https://www.youtube.com/watch?v=GwIo3gDZCVQ",
                "video_duration_seconds": 2100,
                "notes_url": None,
                "key_takeaways": [
                    "Supervised learning requires labeled training data.",
                    "Classification and regression are the two main types of supervised learning.",
                    "Cross-validation helps prevent overfitting your model.",
                ],
                "quiz": [
                    {
                        "question_text": "What type of machine learning is used when labels are available?",
                        "options": {"A": "Unsupervised learning", "B": "Reinforcement learning", "C": "Supervised learning", "D": "Self-supervised learning"},
                        "correct_answer": "C",
                        "explanation": "Supervised learning uses labeled examples to train a model.",
                    },
                ],
            },
        ],
        "assessment_questions": [
            {
                "question_text": "What does 'overfitting' mean in machine learning?",
                "options": {"A": "Model cannot learn from training data", "B": "Model performs well on unseen data", "C": "Model memorizes training data and fails on new data", "D": "Model is too simple"},
                "correct_answer": "C",
            },
            {
                "question_text": "Which Python library is primarily used for machine learning?",
                "options": {"A": "NumPy", "B": "scikit-learn", "C": "Matplotlib", "D": "FastAPI"},
                "correct_answer": "B",
            },
        ],
    },
]

DISCUSSIONS_DATA = [
    {
        "title": "How are you using AI tools in your classroom?",
        "content": "I've started experimenting with ChatGPT to generate quiz questions and lesson summaries. It saves me about 2 hours per week! Would love to hear how others are using it.",
        "category": "ai_tools",
        "replies": [
            "I use it to simplify complex topics for first-year students. Works great for analogies!",
            "I tried Grammarly AI for feedback on assignments. Students loved the instant suggestions.",
        ],
    },
    {
        "title": "Best practices for online assessments",
        "content": "With so many students doing exams remotely, I'm struggling to maintain academic integrity. What tools or strategies do you use for fair online assessments?",
        "category": "teaching_methods",
        "replies": [
            "I use randomized question banks so each student gets a different set. Reduces copying significantly.",
            "Time-limited assessments with shuffled options help a lot. Also Google's Chromebook lockdown browser.",
        ],
    },
    {
        "title": "Publishing research in high-impact journals",
        "content": "I've been trying to get my paper published in Scopus-indexed journals but keep getting rejected. Any tips on improving manuscript quality and selecting the right journal?",
        "category": "research",
        "replies": [
            "Read the aims and scope carefully — mismatches are the #1 reason for desk rejections.",
            "Get feedback from at least 2 colleagues before submission. Fresh eyes catch many issues.",
        ],
    },
    {
        "title": "Cloud lab environments for students",
        "content": "Setting up Python environments on student laptops is a nightmare. Has anyone tried cloud-based lab environments like Google Colab or JupyterHub?",
        "category": "technology",
        "replies": [
            "Google Colab is a game changer. No installation needed, and students can access it from any device!",
        ],
    },
    {
        "title": "Faculty welfare and workload concerns",
        "content": "The workload this semester has been overwhelming — teaching, research, admin work all at once. How do others manage burnout?",
        "category": "general",
        "replies": [
            "Setting strict office hours and saying no to extra commitments has helped me enormously.",
            "Using automation tools for repetitive tasks (grading, emails) saves at least 3 hours a week.",
        ],
    },
]


async def seed_courses():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # Get the admin user to set as creator
        result = await session.execute(select(User).where(User.email == "ms@email.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            print("❌ Admin user not found. Please run seed_db.py first.")
            return

        result = await session.execute(select(User).where(User.email == "san@gmail.com"))
        faculty_user = result.scalar_one_or_none()
        if not faculty_user:
            print("❌ Faculty user not found. Please run seed_db.py first.")
            return

        courses_created = 0
        for course_data in COURSES_DATA:
            # Check if course already exists
            result = await session.execute(select(Course).where(Course.title == course_data["title"]))
            if result.scalar_one_or_none():
                print(f"  ⏭  Skipping (exists): {course_data['title']}")
                continue

            modules_data = course_data.pop("modules")
            assessment_data = course_data.pop("assessment_questions")

            course = Course(
                id=str(uuid4()),
                created_by_id=admin.id,
                **course_data,
            )
            course.is_published = course_data.get("is_published", False)
            session.add(course)
            await session.flush()

            # Add modules
            for mod_data in modules_data:
                quiz_data = mod_data.pop("quiz", [])
                module = CourseModule(
                    id=str(uuid4()),
                    course_id=course.id,
                    **mod_data,
                )
                session.add(module)
                await session.flush()

                # Add quiz questions
                for q in quiz_data:
                    quiz_q = ModuleQuiz(
                        id=str(uuid4()),
                        module_id=module.id,
                        **q,
                    )
                    session.add(quiz_q)

            # Add assessment questions
            for aq_data in assessment_data:
                aq = CourseAssessmentQuestion(
                    id=str(uuid4()),
                    course_id=course.id,
                    **aq_data,
                )
                session.add(aq)

            courses_created += 1
            print(f"  ✅ Created course: {course.title} ({len(modules_data)} modules)")

        # Seed discussions
        discussions_created = 0
        for disc_data in DISCUSSIONS_DATA:
            result = await session.execute(select(Discussion).where(Discussion.title == disc_data["title"]))
            if result.scalar_one_or_none():
                print(f"  ⏭  Skipping discussion (exists): {disc_data['title']}")
                continue

            replies_data = disc_data.pop("replies", [])
            discussion = Discussion(
                id=str(uuid4()),
                faculty_id=faculty_user.id,
                **disc_data,
            )
            session.add(discussion)
            await session.flush()

            for reply_content in replies_data:
                reply = DiscussionReply(
                    id=str(uuid4()),
                    discussion_id=discussion.id,
                    faculty_id=admin.id,
                    content=reply_content,
                )
                session.add(reply)

            discussions_created += 1
            print(f"  ✅ Created discussion: {disc_data['title']}")

        await session.commit()
        print(f"\n🎉 Seeding complete! {courses_created} courses and {discussions_created} discussions created.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_courses())
