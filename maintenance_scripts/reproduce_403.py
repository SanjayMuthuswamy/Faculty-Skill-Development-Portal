import asyncio
import httpx
from app.core.config import settings

async def reproduce():
    url = "http://127.0.0.1:8002/api/v1"
    login_data = {"email": "ms@email.com", "password": "123456"}
    
    async with httpx.AsyncClient() as client:
        # 1. Login
        print(f"Logging in as {login_data['email']}...")
        r = await client.post(f"{url}/auth/login", json=login_data)
        if r.status_code != 200:
            print(f"Login failed: {r.status_code} - {r.text}")
            return
        
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Check public route (no token)
        print("Checking public tests route (no token)...")
        r = await client.get(f"{url}/tests/")
        print(f"Public Tests: {r.status_code}")
        
        # 3. Check /me
        print("Checking /me...")
        r = await client.get(f"{url}/auth/me", headers=headers)
        print(f"Me: {r.status_code} - {r.text}")
        
        # 3. Try to list programs
        print("Listing programs...")
        r = await client.get(f"{url}/programs/", headers=headers)
        print(f"List: {r.status_code}")
        
        # 4. Try to create a program
        print("Creating program...")
        program_data = {
            "title": "Test Program",
            "description": "Reproduction test",
            "domain": "TECHNOLOGY",
            "seats": 20,
            "status": "UPCOMING"
        }
        r = await client.post(f"{url}/programs/", json=program_data, headers=headers)
        print(f"Create: {r.status_code} - {r.text}")

if __name__ == "__main__":
    asyncio.run(reproduce())
