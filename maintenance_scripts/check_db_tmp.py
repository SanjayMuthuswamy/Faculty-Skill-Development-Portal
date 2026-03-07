import asyncio
from app.db.session import async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.faculty_profile import FacultyProfile
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as s:
        # Check profiles with user relationship
        stmt = select(FacultyProfile).options(selectinload(FacultyProfile.user))
        result = await s.execute(stmt)
        profiles = result.scalars().all()
        
        print(f"Total Faculty Profiles Found: {len(profiles)}")
        requested_names = ["Sanjay", "Sakthi", "Vijay", "Ramesh", "Suresh"]
        found_names = []
        
        for p in profiles:
            name = p.user.name if p.user else 'NO USER LINKED'
            print(f"ID: {p.id}")
            print(f"  Name: {name}")
            print(f"  Dept: {p.department}")
            if name in requested_names:
                found_names.append(name)
            print("-" * 20)
            
        print(f"\nSummary of Requested Faculty Found: {len(found_names)}/5")
        for rn in requested_names:
            status = "✅ Found" if rn in found_names else "❌ Missing"
            print(f"  - {rn}: {status}")
            
    await engine.dispose()

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check())
