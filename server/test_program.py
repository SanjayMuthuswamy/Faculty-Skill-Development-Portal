"""Test program creation and capture full error detail."""
import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # Login
        r = await client.post("http://127.0.0.1:8000/api/v1/auth/login", json={
            "email": "ms@email.com", "password": "123456"
        })
        print(f"Login: {r.status_code}")
        if r.status_code != 200:
            print(r.text)
            return
        token = r.json()["access_token"]

        # Try create program
        payload = {
            "title": "Test Program",
            "description": "Test",
            "domain": "TECHNOLOGY",
            "seats": 20,
            "status": "DRAFT"
        }
        r2 = await client.post(
            "http://127.0.0.1:8000/api/v1/programs/",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Origin": "http://localhost:5173"
            }
        )
        print(f"\nCreate Program: {r2.status_code}")
        print(f"CORS header: {r2.headers.get('access-control-allow-origin', 'MISSING')}")
        print(f"Response body: {r2.text[:800]}")

asyncio.run(test())
