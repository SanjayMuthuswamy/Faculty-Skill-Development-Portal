import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post("http://127.0.0.1:8000/api/v1/auth/login", json={
            "email": "ms@email.com", "password": "123456"
        })
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:5173"}

        # Test with EXACTLY what the frontend form sends (title-case domain)
        for domain in ["Technology", "Research", "Teaching"]:
            r2 = await client.post("http://127.0.0.1:8000/api/v1/programs/", json={
                "title": f"Test {domain}",
                "description": "Test desc",
                "domain": domain,
                "seats": 20,
                "status": "DRAFT"
            }, headers=headers)
            print(f"domain={domain!r}: status={r2.status_code}")
            if r2.status_code not in (200, 201):
                print(f"  ERROR: {r2.text[:400]}")
            else:
                prog = r2.json()
                print(f"  OK: id={prog['id']}")

asyncio.run(test())
