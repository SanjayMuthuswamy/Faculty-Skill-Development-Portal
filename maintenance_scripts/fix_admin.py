import asyncio, sys
sys.path.append('.')
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.core.config import settings
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as s:
        result = await s.execute(select(User).where(User.role == UserRole.ADMIN))
        admins = result.scalars().all()
        new_hash = get_password_hash("admin123")
        for a in admins:
            a.password_hash = new_hash
            print(f"Reset password for: {a.email}")
        await s.commit()
        print("All admin passwords reset to: admin123")
    await engine.dispose()

asyncio.run(main())
