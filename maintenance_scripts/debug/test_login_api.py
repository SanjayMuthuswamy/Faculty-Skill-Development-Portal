import asyncio
import httpx
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv('server/.env')
DATABASE_URL = "postgresql+asyncpg://postgres:123456789@127.0.0.1:5432/fsdp_db"

async def test_login_api():
    async with httpx.AsyncClient() as client:
        print("Testing Login API with httpx...")
        payload = {
            "email": "sanjay@fsdp.com",
            "password": "123456"
        }
        try:
            response = await client.post("http://localhost:8000/api/v1/auth/login", json=payload)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_login_api())
