import asyncio
from sqlalchemy import update
from app.db.session import SessionLocal
from app.models.course import Course

async def main():
    async with SessionLocal() as db:
        await db.execute(update(Course).values(is_published=True))
        await db.commit()
    print("All courses published!")

if __name__ == "__main__":
    asyncio.run(main())
