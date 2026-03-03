import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check_users():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email, role, is_active FROM users"))
        users = result.fetchall()
        print("Users in database:")
        for user in users:
            print(f" - Email: {user[0]}, Role: {user[1]}, Active: {user[2]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_users())
