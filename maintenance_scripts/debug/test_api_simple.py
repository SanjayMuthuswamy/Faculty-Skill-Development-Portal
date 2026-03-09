"""
Simple test script to debug API endpoints
"""
import httpx
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def test_api():
    client = httpx.Client()
    
    # 1. Test health
    print("Testing /health...")
    resp = client.get(f"{BASE_URL}/health")
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}\n")
    
    # 2. Login
    print("Testing /auth/login...")
    login_resp = client.post(
        f"{BASE_URL}/auth/login",
        json={"email": "sanjay@fsdp.com", "password": "123456"}
    )
    print(f"Status: {login_resp.status_code}")
    print(f"Response: {login_resp.text}")
    if login_resp.status_code == 200:
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"\n✅ Got token: {token[:20]}...\n")
        
        # 3. Test programs endpoint
        print("Testing GET /programs...")
        prog_get = client.get(f"{BASE_URL}/programs", headers=headers)
        print(f"Status: {prog_get.status_code}")
        print(f"Response preview: {prog_get.text[:200]}\n")
        
        # 4. Try creating a program
        print("Testing POST /programs...")
        program_data = {
            "title": "Test Program",
            "description": "Test",
            "domain": "TECHNOLOGY",
            "status": "DRAFT",
            "seats": 30,
            "mode": "online",
        }
        print(f"Payload: {json.dumps(program_data, indent=2)}")
        prog_post = client.post(
            f"{BASE_URL}/programs",
            json=program_data,
            headers=headers
        )
        print(f"Status: {prog_post.status_code}")
        print(f"Response: {prog_post.text}\n")

if __name__ == "__main__":
    test_api()
