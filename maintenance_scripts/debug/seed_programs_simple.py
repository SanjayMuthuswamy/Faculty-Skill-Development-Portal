"""
Improved data seeding script with better error handling and debugging
"""
import asyncio
import httpx
import json
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
]


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
            print(f"❌ Admin login failed: {admin_resp.status_code} - {admin_resp.text}")
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
            print(f"❌ Faculty login failed: {faculty_resp.status_code} - {faculty_resp.text}")
            return
        faculty_token = faculty_resp.json()["access_token"]
        faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
        print("✅ Faculty logged in\n")
        
        # 3. Create programs
        print("3️⃣ Creating programs...")
        program_ids = []
        for prog_data in PROGRAMS_DATA:
            print(f"   Creating: {prog_data['title']}...")
            prog_resp = await client.post(
                f"{BASE_URL}/programs",
                json=prog_data,
                headers=admin_headers
            )
            if prog_resp.status_code in [200, 201]:
                prog_id = prog_resp.json()["id"]
                program_ids.append(prog_id)
                print(f"   ✅ Created: {prog_id}")
            else:
                print(f"   ❌ Failed ({prog_resp.status_code}): {prog_resp.text}")
        print()
        
        # 4. Enroll faculty in programs
        print("4️⃣ Enrolling faculty in programs...")
        for program_id in program_ids:
            enroll_resp = await client.post(
                f"{BASE_URL}/enrollments",
                json={"program_id": program_id},
                headers=faculty_headers
            )
            if enroll_resp.status_code in [200, 201]:
                print(f"   ✅ Enrolled in program: {program_id}")
            else:
                print(f"   ❌ Enrollment failed ({enroll_resp.status_code}): {enroll_resp.text}")
        print()
        
        # 5. Get faculty profile to check status
        print("5️⃣ Checking faculty profile...")
        profile_resp = await client.get(
            f"{BASE_URL}/faculty/me",
            headers=faculty_headers
        )
        if profile_resp.status_code in [200, 201]:
            profile = profile_resp.json()
            print(f"✅ Faculty Profile:")
            print(f"   - Name: {profile.get('name')}")
            print(f"   - Department: {profile.get('department')}")
        else:
            print(f"❌ Could not fetch profile: {profile_resp.text}")
        print()
        
        # 6. Check enrollments
        print("6️⃣ Checking enrollments...")
        enroll_list_resp = await client.get(
            f"{BASE_URL}/enrollments/me",
            headers=faculty_headers
        )
        if enroll_list_resp.status_code in [200, 201]:
            enrollments = enroll_list_resp.json()
            print(f"✅ Faculty has {len(enrollments)} enrollment(s)")
            for enr in enrollments:
                print(f"   - Program ID: {enr.get('program_id')}, Status: {enr.get('status')}")
        else:
            print(f"❌ Could not fetch enrollments: {enroll_list_resp.text}")
        print()
        
        print("🎉 Seeding completed!")
        print(f"\n📊 Summary:")
        print(f"   • Created {len(program_ids)} programs")
        print(f"   • Enrolled faculty in {len(program_ids)} programs")
        print(f"\n🔄 Refresh http://localhost:5173 to see updates on the dashboard!")


if __name__ == "__main__":
    asyncio.run(seed_all())
