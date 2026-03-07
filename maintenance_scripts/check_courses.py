import sys, os, asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from sqlalchemy import select
from app.models.course import Course

# Create engine WITHOUT echo
engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def check():
    async with SessionLocal() as session:
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        print(f"TOTAL COURSES: {len(courses)}")
        for c in courses: 
            print(f"TITLE: {c.title} | PUBLISHED: {c.is_published} | ID: {c.id}")

if __name__ == "__main__":
    asyncio.run(check())
