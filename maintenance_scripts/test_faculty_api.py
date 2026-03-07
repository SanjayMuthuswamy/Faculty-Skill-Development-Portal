import asyncio, sys
sys.path.append('.')
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    S = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with S() as s:
        r = await s.execute(select(User).where(User.email == "admin@fsdp.com"))
        a = r.scalar_one()
        uid = a.id
    await engine.dispose()

    t = create_access_token(uid)
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30) as c:
        r = await c.get("/api/v1/faculty/", params={"skip": 0, "limit": 100},
                        headers={"Authorization": f"Bearer {t}"})
        print(f"Status: {r.status_code}")
        # Print full response
        text = r.text
        print(text)

asyncio.run(main())
