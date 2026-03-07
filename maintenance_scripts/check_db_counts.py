import asyncio
from app.db.session import async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.user import User, UserRole
from app.models.faculty_profile import FacultyProfile
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as s:
        # User counts
        result = await s.execute(select(func.count(User.id)).where(User.role == UserRole.FACULTY))
        faculty_user_count = result.scalar()
        
        # Profile counts
        result = await s.execute(select(func.count(FacultyProfile.id)))
        profile_count = result.scalar()
        
        print(f"Faculty Users in DB: {faculty_user_count}")
        print(f"Faculty Profiles in DB: {profile_count}")
        
        # Check if profiles are linked correctly
        result = await s.execute(select(FacultyProfile).limit(5))
        profiles = result.scalars().all()
        for p in profiles:
            print(f"Profile {p.id} -> User {p.user_id}")

    await engine.dispose()

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
