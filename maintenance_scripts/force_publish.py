import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from sqlalchemy import select, update
from app.models.course import Course

engine = create_async_engine(settings.DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def force_publish():
    async with SessionLocal() as session:
        # Update all courses to is_published=True
        await session.execute(update(Course).values(is_published=True))
        await session.commit()
        
        # Verify
        result = await session.execute(select(Course))
        courses = result.scalars().all()
        
        with open("course_debug.txt", "w") as f:
            f.write(f"TOTAL COURSES: {len(courses)}\n")
            for c in courses:
                f.write(f"TITLE: {c.title} | PUBLISHED: {c.is_published} | ID: {c.id}\n")
        print("Done. Results saved to server/course_debug.txt")

if __name__ == "__main__":
    asyncio.run(force_publish())
