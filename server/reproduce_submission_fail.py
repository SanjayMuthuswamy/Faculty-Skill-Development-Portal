"""Reproduce submission fail via HTTP."""
import asyncio
import httpx
import logging
from app.core.security import create_access_token

async def reproduce():
    # User: san@gmail.com
    uid = "cf55b92a-8d62-4bd8-9f45-49148b9a0782" # Dr. John Doe (FACULTY)
    token = create_access_token("6e66fbcd-9f45-4914-8b9a-07822f58a2fb") # This is the user ID from check_all_pg_users
    
    # Wait, let me double check the user ID
    # In check_all_pg_users:
    # User: cf55b92a-8d62-4bd8-9f45-49148b9a0782 -> System Administrator (wrong)
    # User: 6e66fbcd-9f45-4914-8b9a-07822f58a2fb -> Dr. John Doe (FACULTY)
    
    faculty_user_id = "6e66fbcd-9f45-4914-8b9a-07822f58a2fb"
    token = create_access_token(faculty_user_id)
    
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "http://localhost:8000/api/v1"
    
    async with httpx.AsyncClient() as client:
        # 1. Get a test ID
        tests_resp = await client.get(f"{base_url}/tests/", headers=headers)
        if tests_resp.status_code != 200:
            print(f"Failed to get tests: {tests_resp.text}")
            return
        
        tests = tests_resp.json()
        if not tests:
            print("No tests found.")
            return
        test_id = tests[0]["id"]
        print(f"Using Test ID: {test_id}")
        
        # 2. Start attempt
        start_resp = await client.post(f"{base_url}/attempts/", headers=headers, json={"test_id": test_id})
        if start_resp.status_code != 200:
            print(f"Failed to start attempt: {start_resp.text}")
            return
        
        attempt_id = start_resp.json()["id"]
        print(f"Started Attempt ID: {attempt_id}")
        
        # 3. Submit
        payload = {
            "answers": [
                {"question_id": "none", "selected_option": "A"}
            ]
        }
        print("Submitting...")
        submit_resp = await client.post(f"{base_url}/attempts/{attempt_id}/submit", headers=headers, json=payload)
        
        print(f"Status: {submit_resp.status_code}")
        print(f"Body: {submit_resp.text}")

if __name__ == "__main__":
    asyncio.run(reproduce())
