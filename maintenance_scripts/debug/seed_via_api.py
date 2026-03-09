"""
Seed course modules via API instead of direct database access.
This allows us to populate data without a database connection.
"""
import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "sanjay@fsdp.com"
ADMIN_PASSWORD = "123456"

# Course data
AI_EDUCATORS_COURSE = {
    "title": "Artificial Intelligence for Educators",
    "description": "A comprehensive guide to understanding and applying AI technologies in modern education. Learn to leverage AI tools for smarter teaching, personalized learning, and automated assessments.",
    "instructor_name": "Dr. Priya Sharma",
    "duration_hours": 8.0,
    "skill_level": "beginner",
    "tags": ["AI", "Teaching", "Technology"],
    "is_published": True,
}

MODULES = [
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
                "explanation": "AI stands for Artificial Intelligence, the simulation of human intelligence by machines."
            },
            {
                "question_text": "Which of the following is an example of AI in education?",
                "options": {"A": "Google Classroom", "B": "Grammarly", "C": "Microsoft Teams", "D": "Zoom"},
                "correct_answer": "B",
                "explanation": "Grammarly uses AI to provide intelligent writing suggestions and corrections."
            }
        ]
    },
    {
        "title": "AI Tools for Teaching",
        "description": "Explore practical AI tools that can enhance your teaching methods and save time on administrative tasks.",
        "order_index": 1,
        "video_url": "https://www.youtube.com/watch?v=3JZ_D3ULvKU",
        "video_duration_seconds": 1200,
        "notes_url": None,
        "key_takeaways": [
            "ChatGPT can help create lesson plans, quizzes, and personalized student feedback.",
            "Video analysis tools like Synthesia can generate educational videos in minutes.",
            "Learning analytics platforms use AI to identify at-risk students early.",
        ],
        "quiz": [
            {
                "question_text": "What can ChatGPT help educators with?",
                "options": {"A": "Only writing essays", "B": "Creating lesson plans and generating quizzes", "C": "Recording videos only", "D": "Taking exams"},
                "correct_answer": "B",
                "explanation": "ChatGPT is versatile and can assist with lesson planning, quiz generation, feedback creation, and more."
            }
        ]
    },
    {
        "title": "Personalization & Student Engagement with AI",
        "description": "Learn how AI enables personalized learning paths and boosts student engagement through adaptive content.",
        "order_index": 2,
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "video_duration_seconds": 1500,
        "notes_url": None,
        "key_takeaways": [
            "Adaptive learning platforms adjust difficulty based on student performance.",
            "AI tutors provide 24/7 support, answering student questions instantly.",
            "Predictive analytics identify learning gaps before they become major issues.",
        ],
        "quiz": [
            {
                "question_text": "What is adaptive learning?",
                "options": {"A": "Learning that adapts to teacher preferences", "B": "Learning paths that adjust based on student performance", "C": "Learning only with videos", "D": "Learning in a classroom"},
                "correct_answer": "B",
                "explanation": "Adaptive learning uses AI to personalize the learning experience, adjusting difficulty and content based on how students are progressing."
            }
        ]
    }
]


async def seed_course():
    """Seed course modules via API"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("🚀 Starting API-based course seeding...\n")
        
        # 1. Login as admin
        print("1️⃣ Logging in as admin...")
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_resp.status_code != 200:
            print(f"❌ Login failed: {login_resp.text}")
            return
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Logged in as {ADMIN_EMAIL}\n")
        
        # 2. Check if course exists
        print("2️⃣ Checking for existing course...")
        courses_resp = await client.get(
            f"{BASE_URL}/courses",
            headers=headers
        )
        
        if courses_resp.status_code != 200:
            print(f"⚠️ Could not fetch courses: {courses_resp.text}")
            print("Attempting to create course anyway...\n")
            course_id = None
        else:
            courses = courses_resp.json()
            existing_course = next(
                (c for c in courses if c["title"] == AI_EDUCATORS_COURSE["title"]),
                None
            )
            if existing_course:
                print(f"✅ Found existing course: {existing_course['id']}")
                course_id = existing_course["id"]
            else:
                print("ℹ️ Course does not exist, will create it\n")
                course_id = None
        
        # 3. Create course if needed
        if not course_id:
            print("3️⃣ Creating course...")
            create_resp = await client.post(
                f"{BASE_URL}/courses",
                json=AI_EDUCATORS_COURSE,
                headers=headers
            )
            
            if create_resp.status_code not in [200, 201]:
                print(f"❌ Failed to create course: {create_resp.text}")
                return
            
            course_id = create_resp.json()["id"]
            print(f"✅ Created course: {course_id}\n")
        else:
            print()
        
        # 4. Add modules
        print("4️⃣ Adding modules...")
        for idx, module_data in enumerate(MODULES, 1):
            quiz_data = module_data.pop("quiz", [])
            
            # Create module
            module_resp = await client.post(
                f"{BASE_URL}/courses/{course_id}/modules",
                json=module_data,
                headers=headers
            )
            
            if module_resp.status_code not in [200, 201]:
                print(f"❌ Failed to create module {idx}: {module_resp.text}")
                continue
            
            module_id = module_resp.json()["id"]
            print(f"✅ Created module {idx}: {module_data['title']}")
            
            # Add quiz questions
            for q_idx, quiz_q in enumerate(quiz_data, 1):
                quiz_resp = await client.post(
                    f"{BASE_URL}/courses/{course_id}/modules/{module_id}/quiz",
                    json=quiz_q,
                    headers=headers
                )
                
                if quiz_resp.status_code in [200, 201]:
                    print(f"   ✅ Added quiz question {q_idx}")
                else:
                    print(f"   ⚠️ Warning: Could not add quiz question {q_idx}")
        
        print("\n🎉 Course seeding completed successfully!")
        print(f"Course ID: {course_id}")
        print(f"You can now view the course at: http://localhost:5173/faculty/courses")


if __name__ == "__main__":
    asyncio.run(seed_course())
