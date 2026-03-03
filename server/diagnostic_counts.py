
import asyncio
from sqlalchemy import select, func
from app.db.session import SessionLocal
from app.models.question_pack import QuestionPack
from app.models.question import Question

async def check():
    async with SessionLocal() as db:
        packs_res = await db.execute(select(QuestionPack))
        packs = packs_res.scalars().all()
        print(f"Found {len(packs)} packs")
        for p in packs:
            q_res = await db.execute(select(func.count(Question.id)).where(Question.pack_id == p.id))
            count = q_res.scalar()
            print(f'Pack "{p.pack_name}" ({p.id}): {count} questions, Domain: {p.domain}')

if __name__ == "__main__":
    asyncio.run(check())
