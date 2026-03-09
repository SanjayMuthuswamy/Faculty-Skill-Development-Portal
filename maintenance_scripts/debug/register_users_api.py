#!/usr/bin/env python3
"""Register test users via API and seed dashboard data"""

import asyncio
import httpx
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

async def main():
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Step 1: Register faculty user
            print("[1] Registering faculty user...")
            faculty_reg = await client.post(
                f"{BASE_URL}/faculty/register-faculty",
                json={
                    "name": "Test Faculty",
                    "email": "faculty@fsdp.com",
                    "department": "Computer Science",
                    "designation": "Assistant Professor",
                    "experience_years": 5,
                    "password": "123456"
                }
            )
            print(f"    Status: {faculty_reg.status_code}")
            if faculty_reg.status_code not in [200, 201]:
                print(f"    Response: {faculty_reg.text[:300]}")
                return
            
            # Step 2: Login as faculty
            print("[2] Logging in as faculty...")
            faculty_login = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "faculty@fsdp.com", "password": "123456"}
            )
            print(f"    Status: {faculty_login.status_code}")
            if faculty_login.status_code != 200:
                print(f"    Response: {faculty_login.text[:300]}")
                return
            
            faculty_token = faculty_login.json()["access_token"]
            faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
            
            # Step 3: Check if we can get user info
            print("[3] Checking user profile...")
            profile_resp = await client.get(f"{BASE_URL}/faculty/me", headers=faculty_headers)
            print(f"    Status: {profile_resp.status_code}")
            if profile_resp.status_code == 200:
                profile = profile_resp.json()
                print(f"    Faculty ID: {profile.get('id')}")
                user_role = profile.get('role', 'unknown')
                print(f"    Role: {user_role}")
                
                if user_role and str(user_role).lower() == 'admin':
                    print("\n    Faculty has ADMIN role - can create programs!")
                else:
                    print("\n    Faculty has FACULTY role - cannot create programs directly")
                    print("    Need to create/use an admin account instead")
            
            print("\nRegistration successful! Faculty can now login and view dashboard.")
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
