"""
End-to-end API test: login as admin -> create program
Proves backend RBAC works correctly.
Run: python e2e_test.py
"""
import asyncio
import sys
sys.path.insert(0, '.')

import httpx

BASE = "http://127.0.0.1:8000/api/v1"

async def test():
    async with httpx.AsyncClient() as client:
        print("\n=== STEP 1: Login as ADMIN (ms@email.com) ===")
        r = await client.post(f"{BASE}/auth/login", json={
            "email": "ms@email.com",
            "password": "123456"
        })
        if r.status_code != 200:
            print(f"❌ Login failed: {r.status_code} - {r.text}")
            return
        token = r.json()["access_token"]
        print(f"✅ Login OK — token: {token[:30]}...")

        headers = {"Authorization": f"Bearer {token}"}

        print("\n=== STEP 2: Verify identity via /auth/me ===")
        r = await client.get(f"{BASE}/auth/me", headers=headers)
        me = r.json()
        print(f"{'✅' if r.status_code == 200 else '❌'} /me: status={r.status_code}")
        print(f"   email={me.get('email')} role={me.get('role')}")

        print("\n=== STEP 3: POST /programs/ (requires ADMIN) ===")
        r = await client.post(f"{BASE}/programs/", headers=headers, json={
            "title": "Test Program E2E",
            "description": "Created by e2e test",
            "domain": "TECHNOLOGY",
            "seats": 20,
            "status": "DRAFT"
        })
        if r.status_code in (200, 201):
            prog = r.json()
            print(f"✅ Program created: id={prog.get('id')} title={prog.get('title')}")
        else:
            print(f"❌ Create program failed: {r.status_code}")
            print(f"   Detail: {r.text[:300]}")

        print("\n=== STEP 4: Try with FACULTY user ===")
        # Find the faculty user
        r2 = await client.post(f"{BASE}/auth/login", json={
            "email": "sanjay@gmail.com",
            "password": "123456"
        })
        if r2.status_code == 200:
            ftoken = r2.json()["access_token"]
            fheaders = {"Authorization": f"Bearer {ftoken}"}
            r3 = await client.post(f"{BASE}/programs/", headers=fheaders, json={
                "title": "Should Fail", "domain": "TECHNOLOGY", "seats": 5
            })
            expected = r3.status_code == 403
            print(f"{'✅' if expected else '❌'} Faculty create program: "
                  f"status={r3.status_code} ({'correctly blocked' if expected else 'UNEXPECTED!'})")
            if not expected:
                print(f"   Detail: {r3.text[:200]}")
        else:
            print(f"  (Faculty login skipped: {r2.status_code})")

        print("\n=== SUMMARY ===")
        print("Backend RBAC is working correctly if all steps above show ✅")
        print("If you see 403 in the browser, you are logged in as FACULTY.")
        print("ACTION: Log out → Log back in as ms@email.com / 123456")

asyncio.run(test())
