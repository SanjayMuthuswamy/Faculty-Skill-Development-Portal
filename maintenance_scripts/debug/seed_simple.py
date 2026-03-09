#!/usr/bin/env python3
"""Simple script to seed dashboard data without emoji encoding issues"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

PROGRAMS_DATA = [
    {
        "title": "Advanced Python Programming",
        "description": "Master advanced Python concepts and best practices",
        "domain": "Technology",
        "seats": 50,
        "mode": "Online",
        "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=63)).isoformat(),
        "topics": ["OOP", "Decorators", "Async Programming"],
        "benefits": ["Industry-standard practices", "Career advancement"]
    },
    {
        "title": "Data Analysis & Visualization",
        "description": "Learn data analysis with pandas, numpy, and visualization tools",
        "domain": "Data & Analytics",
        "seats": 40,
        "mode": "Online",
        "start_date": (datetime.now() + timedelta(days=14)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=84)).isoformat(),
        "topics": ["Data Cleaning", "Statistical Analysis", "Visualization"],
        "benefits": ["Better decision making", "Technical excellence"]
    },
    {
        "title": "Cybersecurity Fundamentals",
        "description": "Secure your systems and understand modern threats",
        "domain": "Cybersecurity",
        "seats": 35,
        "mode": "Online",
        "start_date": (datetime.now() + timedelta(days=21)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=77)).isoformat(),
        "topics": ["Encryption", "Network Security", "Threat Analysis"],
        "benefits": ["Enterprise security", "Industry compliance"]
    },
    {
        "title": "Advanced Teaching Methods",
        "description": "Enhance pedagogical skills and learning effectiveness",
        "domain": "Teaching",
        "seats": 30,
        "mode": "Hybrid",
        "start_date": (datetime.now() + timedelta(days=5)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=47)).isoformat(),
        "topics": ["Active Learning", "Assessment", "Engagement"],
        "benefits": ["Student satisfaction", "Professional growth"]
    }
]

async def seed_all():
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            print("[1] Logging in as admin...")
            admin_login = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "admin@fsdp.com", "password": "123456"}
            )
            print(f"    Admin login: {admin_login.status_code}")
            if admin_login.status_code != 200:
                print(f"    ERROR: {admin_login.text}")
                return
            
            admin_token = admin_login.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            print("[2] Logging in as faculty...")
            faculty_login = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "faculty@fsdp.com", "password": "123456"}
            )
            print(f"    Faculty login: {faculty_login.status_code}")
            if faculty_login.status_code != 200:
                print(f"    ERROR: {faculty_login.text}")
                return
            
            faculty_token = faculty_login.json()["access_token"]
            faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
            
            print(f"[3] Creating programs...")
            program_ids = []
            for prog_data in PROGRAMS_DATA:
                resp = await client.post(
                    f"{BASE_URL}/programs/",
                    json=prog_data,
                    headers=admin_headers
                )
                print(f"    {prog_data['title']}: {resp.status_code}")
                if resp.status_code in [200, 201]:
                    program_ids.append(resp.json()["id"])
                else:
                    print(f"    ERROR: {resp.text[:200]}")
            
            print(f"[4] Created {len(program_ids)} programs")
            
            print("[5] Enrolling faculty in programs...")
            for prog_id in program_ids:
                resp = await client.post(
                    f"{BASE_URL}/enrollments/",
                    json={"program_id": prog_id},
                    headers=faculty_headers
                )
                print(f"    Program {prog_id}: {resp.status_code}")
                if resp.status_code not in [200, 201]:
                    print(f"    ERROR: {resp.text[:200]}")
            
            print("[6] Verifying data...")
            enroll_resp = await client.get(
                f"{BASE_URL}/enrollments/me",
                headers=faculty_headers
            )
            print(f"    Faculty enrollments: {len(enroll_resp.json())}")
            
            prog_resp = await client.get(
                f"{BASE_URL}/programs/",
                headers=faculty_headers
            )
            print(f"    Total programs: {len(prog_resp.json())}")
            
            print("\n=== SEEDING COMPLETE ===")
            print(f"Programs created: {len(program_ids)}")
            print(f"Faculty enrollments: {len(enroll_resp.json())}")
            print("\nBrowser http://localhost:5173 should now show updated dashboard!")
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_all())
