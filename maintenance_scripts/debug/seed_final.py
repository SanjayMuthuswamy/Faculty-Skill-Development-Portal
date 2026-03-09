"""
Fixed data seeding script with correct endpoints (including trailing slashes)
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
        "status": "DRAFT",
        "seats": 50,
        "mode": "online",
        "topics": ["Python Basics", "OOP", "Data Structures"],
        "benefits": ["Learn industry best practices", "Hands-on coding", "Certificate"],
    },
    {
        "title": "Data Analysis Workshop",
        "description": "Learn to analyze educational data and create compelling visualizations.",
        "domain": "DATA_SCIENCE",
        "status": "DRAFT",
        "seats": 40,
        "mode": "hybrid",
        "topics": ["Data Collection", "Analysis", "Viz"],
        "benefits": ["Data-driven decisions", "Visualization skills"],
    },
    {
        "title": "Cybersecurity for Educators",
        "description": "Protect yourself and your students from digital threats.",
        "domain": "CYBERSECURITY",
        "status": "DRAFT",
        "seats": 60,
        "mode": "online",
        "topics": ["Password Management", "Phishing", "Data Protection"],
        "benefits": ["Secure systems", "Protect data"],
    },
]


async def seed_all():
    """Seed all data via API"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        print("🚀 Starting data seeding via API...\n")
        
        # 1. Admin login
        print("1️⃣ Admin login...")
        admin_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if admin_resp.status_code != 200:
            print(f"❌ Failed: {admin_resp.status_code}")
            return
        admin_token = admin_resp.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("✅ Admin logged in\n")
        
        # 2. Faculty login
        print("2️⃣ Faculty login...")
        faculty_resp = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": FACULTY_EMAIL, "password": FACULTY_PASSWORD}
        )
        if faculty_resp.status_code != 200:
            print(f"❌ Failed: {faculty_resp.status_code}")
            return
        faculty_token = faculty_resp.json()["access_token"]
        faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
        print("✅ Faculty logged in\n")
        
        # 3. Create programs (with trailing slash!)
        print("3️⃣ Creating programs...")
        program_ids = []
        for prog_data in PROGRAMS_DATA:
            prog_resp = await client.post(
                f"{BASE_URL}/programs/",  # ← TRAILING SLASH
                json=prog_data,
                headers=admin_headers
            )
            if prog_resp.status_code in [200, 201]:
                prog_id = prog_resp.json()["id"]
                program_ids.append(prog_id)
                print(f"   ✅ {prog_data['title'][:40]}")
            else:
                print(f"   ❌ Failed ({prog_resp.status_code}): {prog_resp.text[:100]}")
        print()
        
        # 4. Enroll faculty in programs
        print("4️⃣ Enrolling faculty...")
        for program_id in program_ids:
            enroll_resp = await client.post(
                f"{BASE_URL}/enrollments/",  # ← TRAILING SLASH
                json={"program_id": program_id},
                headers=faculty_headers
            )
            if enroll_resp.status_code in [200, 201]:
                print(f"   ✅ Enrolled in program {program_id[:8]}...")
            else:
                print(f"   ❌ Failed ({enroll_resp.status_code})")
        print()
        
        # 5. Check enrollments
        print("5️⃣ Verifying enrollments...")
        enroll_list_resp = await client.get(
            f"{BASE_URL}/enrollments/me",  # ← TRAILING SLASH
            headers=faculty_headers
        )
        if enroll_list_resp.status_code in [200, 201]:
            enrollments = enroll_list_resp.json()
            print(f"   ✅ Faculty has {len(enrollments)} enrollment(s)\n")
        
        print("🎉  Completed!")
        print(f"📊 Created {len(program_ids)} programs")
        print(f"📊 Enrolled in {len(program_ids)} programs")
        print(f"\n🔄 Refresh http://localhost:5173 to see dashboard updates!")


if __name__ == "__main__":
    asyncio.run(seed_all())
