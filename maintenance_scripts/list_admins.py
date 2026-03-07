import asyncio, sys
sys.path.append('.')
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.models.user import User
from app.models.enums import UserRole

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as s:
        result = await s.execute(select(User).where(User.role == UserRole.ADMIN))
        admins = result.scalars().all()
        for a in admins:
            print(f"Name: {a.name} | Email: {a.email} | Active: {a.is_active}")
        if not admins:
            print("No admin users found!")
    await engine.dispose()

asyncio.run(main())
