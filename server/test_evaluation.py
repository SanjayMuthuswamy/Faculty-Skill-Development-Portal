"""Verification script for enhanced test evaluation."""
import asyncio
import logging
from datetime import datetime, timezone
logging.disable(logging.CRITICAL)

async def verify():
    from app.db.session import engine, SessionLocal
    from app.services.attempt_service import AttemptService
    from app.models.test import Test
    from app.models.faculty_profile import FacultyProfile
    from sqlalchemy.future import select
    
    async with SessionLocal() as db:
        from sqlalchemy.orm import selectinload
        service = AttemptService(db)
        from app.models.question import Question
        
        # 1. Get a test and a faculty
        test_res = await db.execute(select(Test).limit(1))
        test = test_res.scalar_one_or_none()
        
        faculty_res = await db.execute(select(FacultyProfile).limit(1))
        faculty = faculty_res.scalar_one_or_none()
        
        if not test or not faculty:
            print("Error: No test or faculty profile found in DB.")
            return

        # Get some questions for this domain
        from app.models.question_pack import QuestionPack
        q_res = await db.execute(
            select(Question)
            .join(QuestionPack)
            .where(QuestionPack.domain == test.domain)
            .limit(5)
        )
        questions = q_res.scalars().all()
        
        if not questions:
            # Fallback: just get any questions
            q_res = await db.execute(select(Question).limit(5))
            questions = q_res.scalars().all()

        print(f"Testing with Test: {test.title} ({test.id})")
        print(f"Testing with Faculty: {faculty.id}")
        print(f"Total Questions in Test: {test.total_questions}")
        print(f"Using questions: {[q.id for q in questions]}")
        if len(questions) < 2:
            print("Error: Test has fewer than 2 questions.")
            return
            
        # 2. Start attempt
        attempt = await service.start_attempt(faculty.id, test.id)
        print(f"Started Attempt: {attempt.id}")
        # 3. Submit specific answers
        questions = test.questions if hasattr(test, 'questions') else questions # use the ones we fetched
        
        # Submit 1 correct
        q1 = questions[0]
        q1_correct = q1.correct_option.value if hasattr(q1.correct_option, 'value') else q1.correct_option
        print(f"Q1: {q1.question_text} | Correct: {q1_correct} (Type: {type(q1_correct)})")
        ans1 = await service.submit_answer(attempt.id, q1.id, str(q1_correct))
        print(f"Submitted Q1 Correct | ans.is_correct = {ans1.is_correct}")
        
        # Submit 1 incorrect
        q2 = questions[1]
        q2_correct = q2.correct_option.value if hasattr(q2.correct_option, 'value') else q2.correct_option
        # Ensure it's different
        wrong_option = 'B' if q2_correct != 'B' else 'A'
        print(f"Q2: {q2.question_text} | Correct: {q2_correct} | Submitting Wrong: {wrong_option}")
        ans2 = await service.submit_answer(attempt.id, q2.id, wrong_option)
        print(f"Submitted Q2 Wrong | ans.is_correct = {ans2.is_correct}")
        
        # 4. Finish attempt
        print("Finishing attempt...")
        finished = await service.finish_attempt(attempt.id)
        
        # Re-verify counts manually
        print(f"DEBUG: len(finished.answers) = {len(finished.answers)}")
        for a in finished.answers:
            print(f"  Ans for {a.question_id}: selected={a.selected_option}, correct={a.is_correct}")
        
        # 5. Assert results
        print("-" * 20)
        print(f"Score: {finished.score}")
        print(f"Correct Count: {finished.correct_count}")
        print(f"Incorrect Count: {finished.incorrect_count}")
        print(f"Unanswered Count: {finished.unanswered_count}")
        print(f"Time Taken: {finished.time_taken_seconds}s")
        print(f"Accuracy: {finished.accuracy}%")
        
        expected_unanswered = test.total_questions - 2
        
        assert finished.correct_count == 1, f"Expected 1 correct, got {finished.correct_count}"
        assert finished.incorrect_count == 1, f"Expected 1 incorrect, got {finished.incorrect_count}"
        assert finished.unanswered_count == expected_unanswered, f"Expected {expected_unanswered} unanswered, got {finished.unanswered_count}"
        assert finished.time_taken_seconds >= 0, "Time taken should be >= 0"
        
        print("-" * 20)
        print("VERIFICATION SUCCESSFUL: Performance metrics are accurate.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify())
