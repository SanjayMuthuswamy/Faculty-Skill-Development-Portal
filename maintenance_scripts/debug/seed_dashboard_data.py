"""
Comprehensive API-based seeding script for programs, enrollments, and growth plans
"""
import asyncio
import httpx
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "sanjay@fsdp.com"
ADMIN_PASSWORD = "123456"
FACULTY_EMAIL = "faculty@fsdp.com"
FACULTY_PASSWORD = "123456"

PROGRAMS_DATA = [
    {
        "title": "Advanced Python Programming for Educators",
        "description": "Master Python programming concepts and teach modern programming to your students.",
        "domain": "TECHNOLOGY",
        "status": "PUBLISHED",
        "seats": 50,
        "mode": "online",
        "topics": ["Python Basics", "Object-Oriented Programming", "Data Structures", "Best Practices"],
        "benefits": ["Learn industry best practices", "Hands-on coding experience", "Certificate of completion"],
        "start_date": (datetime.now() + timedelta(days=5)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=35)).isoformat(),
    },
    {
        "title": "Data Analysis & Visualization Workshop",
        "description": "Learn to analyze educational data and create compelling visualizations for decision making.",
        "domain": "DATA_SCIENCE",
        "status": "PUBLISHED",
        "seats": 40,
        "mode": "hybrid",
        "topics": ["Data Collection", "Data Cleaning", "Analysis Techniques", "Tableau/Power BI"],
        "benefits": ["Data-driven decision making", "Visualization skills", "Practical Excel techniques"],
        "start_date": (datetime.now() + timedelta(days=3)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
    },
    {
        "title": "Cybersecurity Awareness for Educators",
        "description": "Protect yourself and your students from digital threats and cyber attacks.",
        "domain": "CYBERSECURITY",
        "status": "PUBLISHED",
        "seats": 60,
        "mode": "online",
        "topics": ["Password Management", "Phishing Detection", "Data Protection", "Privacy Laws"],
        "benefits": ["Secure your systems", "Protect student data", "Compliance knowledge"],
        "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=25)).isoformat(),
    },
    {
        "title": "Effective Communication Skills",
        "description": "Enhance your communication and presentation skills for better faculty engagement.",
        "domain": "PEDAGOGY",
        "status": "PUBLISHED",
        "seats": 35,
        "mode": "in-person",
        "topics": ["Public Speaking", "Written Communication", "Listening Skills", "Conflict Resolution"],
        "benefits": ["Improved student interaction", "Better presentation skills", "Leadership development"],
        "start_date": (datetime.now() + timedelta(days=10)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=40)).isoformat(),
    }
]

SKILLS_DATA = [
    {"name": "Python Programming", "domain": "TECHNOLOGY"},
    {"name": "Data Analysis", "domain": "DATA_SCIENCE"},
    {"name": "AI/Machine Learning", "domain": "TECHNOLOGY"},
    {"name": "Cybersecurity", "domain": "CYBERSECURITY"},
    {"name": "Teaching Methodology", "domain": "PEDAGOGY"},
    {"name": "Cloud Computing", "domain": "TECHNOLOGY"},
]

GROWTH_PLAN_DATA = {
    "title": "Q1 2026 Skill Development Plan",
    "description": "Personalized growth path focusing on technical and pedagogical skills",
    "weeks": [
        {
            "week_number": 1,
            "topics": ["Python Fundamentals", "Teaching with Tech"],
            "tasks": [
                {"label": "Complete Python Basics course", "done": True},
                {"label": "Attend AI in Education workshop", "done": False},
                {"label": "Practice coding exercises daily", "done": False},
            ]
        },
        {
            "week_number": 2,
            "topics": ["Data Structures", "Student Engagement"],
            "tasks": [
                {"label": "Master lists, tuples, and dictionaries", "done": False},
                {"label": "Design interactive lesson plans", "done": False},
            ]
        },
        {
            "week_number": 3,
            "topics": ["OOP Concepts", "Assessment Strategies"],
            "tasks": [
                {"label": "Learn Classes and Objects", "done": False},
                {"label": "Design modern quizzes with AI", "done": False},
            ]
        },
        {
            "week_number": 4,
            "topics": ["Web Development Basics", "Mentoring Skills"],
            "tasks": [
                {"label": "Introduction to web frameworks", "done": False},
                {"label": "Mentoring student projects", "done": False},
            ]
        },
        {
            "week_number": 5,
            "topics": ["Data Analysis & Visualization", "Research Methods"],
            "tasks": [
                {"label": "Learn Pandas and Matplotlib", "done": False},
                {"label": "Introduction to research methodology", "done": False},
            ]
        },
        {
            "week_number": 6,
            "topics": ["Reflection & Planning", "Future Goals"],
            "tasks": [
                {"label": "Review progress and achievements", "done": False},
                {"label": "Plan next quarter's objectives", "done": False},
            ]
        },
    ],
}


async def seed_all():
    """Seed all data via API"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("🚀 Starting comprehensive data seeding via API...\n")
        
        # 1. Admin login
        print("1️⃣ Logging in as admin...")
        admin_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if admin_resp.status_code != 200:
            print(f"❌ Admin login failed: {admin_resp.text}")
            return
        admin_token = admin_resp.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("✅ Admin logged in\n")
        
        # 2. Faculty login
        print("2️⃣ Logging in as faculty user...")
        faculty_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": FACULTY_EMAIL, "password": FACULTY_PASSWORD}
        )
        if faculty_resp.status_code != 200:
            print(f"❌ Faculty login failed: {faculty_resp.text}")
            return
        faculty_token = faculty_resp.json()["access_token"]
        faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
        print("✅ Faculty logged in\n")
        
        # 3. Create skills
        print("3️⃣ Creating skills...")
        skill_map = {}
        existing_skills_resp = await client.get(f"{BASE_URL}/skills", headers=admin_headers)
        if existing_skills_resp.status_code == 200:
            existing = existing_skills_resp.json()
            for skill in existing:
                skill_map[skill["name"]] = skill["id"]
        
        for skill in SKILLS_DATA:
            if skill["name"] not in skill_map:
                skill_resp = await client.post(
                    f"{BASE_URL}/skills",
                    json=skill,
                    headers=admin_headers
                )
                if skill_resp.status_code in [200, 201]:
                    skill_map[skill["name"]] = skill_resp.json()["id"]
                    print(f"✅ Created skill: {skill['name']}")
        print()
        
        # 4. Create programs
        print("4️⃣ Creating programs...")
        program_ids = []
        for prog_data in PROGRAMS_DATA:
            prog_resp = await client.post(
                f"{BASE_URL}/programs",
                json=prog_data,
                headers=admin_headers
            )
            if prog_resp.status_code in [200, 201]:
                prog_id = prog_resp.json()["id"]
                program_ids.append(prog_id)
                print(f"✅ Created program: {prog_data['title']}")
        print()
        
        # 5. Enroll faculty in programs
        print("5️⃣ Enrolling faculty in programs...")
        for program_id in program_ids[:3]:  # Enroll in first 3 programs
            enroll_resp = await client.post(
                f"{BASE_URL}/enrollments",
                json={"program_id": program_id},
                headers=faculty_headers
            )
            if enroll_resp.status_code in [200, 201]:
                print(f"✅ Enrolled in program: {program_id}")
        print()
        
        # 6. Verify faculty skills
        print("6️⃣ Verifying faculty skills...")
        skills_to_verify = ["Python Programming", "Data Analysis", "Teaching Methodology"]
        for skill_name in skills_to_verify:
            if skill_name in skill_map:
                verify_resp = await client.post(
                    f"{BASE_URL}/faculty/skills/{skill_map[skill_name]}/verify",
                    json={"status": "VERIFIED"},
                    headers=admin_headers
                )
                if verify_resp.status_code in [200, 201]:
                    print(f"✅ Verified skill: {skill_name}")
        print()
        
        # 7. Create growth plan
        print("7️⃣ Creating growth plan...")
        plan_resp = await client.post(
            f"{BASE_URL}/growth-plans",
            json=GROWTH_PLAN_DATA,
            headers=faculty_headers
        )
        if plan_resp.status_code in [200, 201]:
            print(f"✅ Created growth plan for faculty")
        else:
            print(f"⚠️ Could not create growth plan: {plan_resp.text}")
        print()
        
        print("🎉 Seeding completed successfully!")
        print("\n📊 Summary:")
        print(f"   • Created {len(program_ids)} programs")
        print(f"   • Enrolled faculty in 3 programs")
        print(f"   • Created {len(SKILLS_DATA)} skills")
        print(f"   • Verified 3 skills for faculty")
        print(f"   • Created personalized growth plan")
        print(f"\n🔄 Refresh http://localhost:5173 to see updates on the dashboard!")


if __name__ == "__main__":
    asyncio.run(seed_all())
