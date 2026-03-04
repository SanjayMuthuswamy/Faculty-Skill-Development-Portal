
import asyncio
import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

# Add the server directory to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import SessionLocal
from app.models import (
    User, FacultyProfile, Test, Question, 
    Attempt, AttemptAnswer, QuestionPack
)
from app.services.attempt_service import AttemptService
from app.schemas.attempt import AttemptAnswerBase
from sqlalchemy.future import select

async def verify():
    async with SessionLocal() as db:
        service = AttemptService(db)
        
        # 1. Get a faculty and a test
        res = await db.execute(select(FacultyProfile).limit(1))
        faculty = res.scalar_one_or_none()
        
        res = await db.execute(select(Test).limit(1))
        test = res.scalar_one_or_none()
        
        if not faculty or not test:
            print("Error: Need at least one faculty and one test in DB")
            return

        print(f"Testing with Faculty: {faculty.id} and Test: {test.title} ({test.id})")

        # 2. Start attempt
        attempt = await service.start_attempt(faculty.id, test.id)
        print(f"Started Attempt: {attempt.id}")

        # 3. Simulate bulk submission with mixed casing and spaces
        # Fetch actual questions to know correct options
        from app.models.question_pack import QuestionPack
        q_res = await db.execute(
            select(Question)
            .join(QuestionPack, Question.pack_id == QuestionPack.id)
            .where(QuestionPack.domain == test.domain)
            .limit(2)
        )
        questions = q_res.scalars().all()
        
        if len(questions) < 2:
            print("Error: Need at least 2 questions for verify")
            return

        q1 = questions[0]
        q1_correct = q1.correct_option
        
        q2 = questions[1]
        q2_correct = q2.correct_option
        wrong_option = 'B' if q2_correct != 'B' else 'A'

        print(f"Submitting Q1: '{q1_correct.lower()} ' (Correct with space/case) and Q2: '{wrong_option}' (Wrong)")
        
        submission = [
            AttemptAnswerBase(question_id=q1.id, selected_option=f" {q1_correct.lower()} "),
            AttemptAnswerBase(question_id=q2.id, selected_option=wrong_option)
        ]
        
        # 4. Use bulk_submit
        finished = await service.bulk_submit(attempt.id, submission)
        
        print("-" * 20)
        print(f"Finished Attempt summary:")
        print(f"  Score: {finished.score}/{finished.total}")
        print(f"  Accuracy: {finished.accuracy}%")
        print(f"  Correct Count: {finished.correct_count}")
        print(f"  Incorrect Count: {finished.incorrect_count}")
        print(f"  Unanswered Count: {finished.unanswered_count}")
        print(f"  Test Title: {finished.test_title}")
        print(f"  Domain: {finished.domain}")
        print(f"  Submitted At: {finished.submitted_at}")

        # 5. Check faculty history returns same data
        history = await service.get_faculty_attempts(faculty.id)
        latest = next(a for a in history if a.id == finished.id)
        print("-" * 20)
        print(f"History entry check:")
        print(f"  Test Title: {latest.test_title}")
        print(f"  Domain: {latest.domain}")
        print(f"  Score: {latest.score}/{latest.total}")

        assert finished.correct_count == 1
        assert finished.incorrect_count == 1
        assert finished.unanswered_count == finished.total - 2
        assert finished.test_title == test.title
        assert latest.test_title == test.title
        
        print("\nVerification SUCCESS!")

if __name__ == "__main__":
    asyncio.run(verify())
