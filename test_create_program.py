import asyncio
import httpx
from datetime import datetime, timedelta

async def test_create_program():
    async with httpx.AsyncClient() as client:
        # 1. Login
        print("Logging in as admin...")
        login_resp = await client.post(
            "http://localhost:8000/api/v1/auth/login", 
            json={"email": "sanjay@fsdp.com", "password": "123456"}
        )
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.text}")
            return
            
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create Program
        print("Creating test program...")
        program_data = {
            "title": f"Test Program {datetime.now().strftime('%H%M%S')}",
            "description": "A test program for verification",
            "domain": "Technology",
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=10)).isoformat(),
            "seats": 50,
            "status": "DRAFT"
        }
        
        resp = await client.post("http://localhost:8000/api/v1/programs/", json=program_data, headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")

if __name__ == "__main__":
    asyncio.run(test_create_program())
