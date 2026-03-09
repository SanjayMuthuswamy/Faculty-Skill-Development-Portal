"""
Final comprehensive seeding script with correct domain values
"""
import asyncio
import httpx
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "sanjay@fsdp.com"
ADMIN_PASSWORD = "123456"
FACULTY_EMAIL = "faculty@fsdp.com"
FACULTY_PASSWORD = "123456"

# Using correct SkillDomain enum values
PROGRAMS_DATA = [
    {
        "title": "Advanced Python Programming",
        "description": "Master Python for teaching and research",
        "domain": "Technology",
        "status": "DRAFT",
        "seats": 50,
        "mode": "online",
        "topics": ["Python Basics", "OOP", "Data Structures", "Best Practices"],
        "benefits": ["Learn industry standards", "Hands-on practice", "Certificate"],
    },
    {
        "title": "Data Analysis & Visualization",
        "description": "Learn data analysis techniques for educational research",
        "domain": "Data & Analytics",
        "status": "DRAFT",
        "seats": 40,
        "mode": "hybrid",
        "topics": ["Data Collection", "Analysis Methods", "Visualization Tools"],
        "benefits": ["Data-driven insights", "Visualization expertise"],
    },
    {
        "title": "Cybersecurity Fundamentals",
        "description": "Protect yourself and your institution from cyber threats",
        "domain": "Cybersecurity",
        "status": "DRAFT",
        "seats": 60,
        "mode": "online",
        "topics": ["Security Basics", "Threat Detection", "Best Practices"],
        "benefits": ["Enhanced security", "Data protection", "Compliance knowledge"],
    },
    {
        "title": "Advanced Teaching Methods",
        "description": "Innovative approaches to modern education",
        "domain": "Teaching",
        "status": "DRAFT",
        "seats": 35,
        "mode": "in-person",
        "topics": ["Active Learning", "Assessment Strategies", "Technology Integration"],
        "benefits": ["Improved student engagement", "Better learning outcomes"],
    },
]


async def seed_all():
    """Seed all data via API"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("🚀 Comprehensive Dashboard Seeding\n")
        
        # 1. Login
        print("1️⃣ Admin login...")
        admin_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        admin_token = admin_resp.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("✅\n")
        
        print("2️⃣ Faculty login...")
        faculty_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": FACULTY_EMAIL, "password": FACULTY_PASSWORD}
        )
        faculty_token = faculty_resp.json()["access_token"]
        faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
        print("✅\n")
        
        # 2. Create programs
        print("3️⃣ Creating programs...")
        program_ids = []
        for prog_data in PROGRAMS_DATA:
            prog_resp = await client.post(
                f"{BASE_URL}/programs/",
                json=prog_data,
                headers=admin_headers
            )
            if prog_resp.status_code in [200, 201]:
                prog_id = prog_resp.json()["id"]
                program_ids.append(prog_id)
                print(f"   ✅ {prog_data['title']}")
        print()
        
        # 3. Enroll faculty
        print("4️⃣ Enrolling faculty...")
        for program_id in program_ids:
            enroll_resp = await client.post(
                f"{BASE_URL}/enrollments/",
                json={"program_id": program_id},
                headers=faculty_headers
            )
        print(f"   ✅ Enrolled in {len(program_ids)} programs\n")
        
        # 4. Verify
        print("5️⃣ Verification...")
        enroll_list_resp = await client.get(
            f"{BASE_URL}/enrollments/me",
            headers=faculty_headers
        )
        enrolled = enroll_list_resp.json()
        print(f"   ✅ Faculty enrollments: {len(enrolled)}")
        
        prog_list_resp = await client.get(
            f"{BASE_URL}/programs/",
            headers=faculty_headers
        )
        all_progs = prog_list_resp.json()
        print(f"   ✅ Total programs: {len(all_progs)}\n")
        
        print("=" * 50)
        print("🎉 SEEDING COMPLETE!")
        print("=" * 50)
        print(f"\n📊 Data Summary:")
        print(f"   • Programs created: {len(program_ids)}")
        print(f"   • Faculty enrollments: {len(enrolled)}")
        print(f"\n✨ Dashboard Updates:")
        print(f"   • 'Enrolled Programs' card: Now shows {len(enrolled)}")
        print(f"   • 'Recommended Programs' card: Shows available programs")
        print(f"\n🔄 Next Steps:")
        print(f"   1. Refresh browser: http://localhost:5173")
        print(f"   2. Login as: faculty@fsdp.com / 123456")
        print(f"   3. View dashboard to see updated metrics")


if __name__ == "__main__":
    asyncio.run(seed_all())
