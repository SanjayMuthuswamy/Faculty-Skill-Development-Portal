from app.services.llm_service import LLMService
from app.services.ai_question_service import AIQuestionService
from app.schemas.question_draft import QuestionDraftBatchCreate


def test_generate_quiz_falls_back_without_api_key(monkeypatch) -> None:
    monkeypatch.setattr("app.services.llm_service.settings.OPENROUTER_API_KEY", None)
    service = LLMService()

    quiz = __import__("asyncio").run(
        service.generate_quiz(
            topic="Database normalization, BCNF, transactions",
            difficulty="MEDIUM",
            num_questions=3,
            marks=2,
        )
    )

    assert quiz is not None
    assert len(quiz.quiz) == 3
    assert all(question.correct_answer in {"A", "B", "C", "D"} for question in quiz.quiz)


def test_generate_roadmap_falls_back_without_api_key(monkeypatch) -> None:
    monkeypatch.setattr("app.services.llm_service.settings.OPENROUTER_API_KEY", None)
    service = LLMService()

    roadmap = __import__("asyncio").run(
        service.generate_roadmap(
            skill="Applied AI for teaching",
            domain="AI",
            current_level=2,
            target_level=5,
            weekly_hours=4,
        )
    )

    assert roadmap is not None
    assert len(roadmap.weeks) == 4
    assert all(week.tasks for week in roadmap.weeks)


def test_ai_question_generation_uses_clean_topic_for_fallback(monkeypatch) -> None:
    monkeypatch.setattr("app.services.llm_service.settings.OPENROUTER_API_KEY", None)

    class DummySession:
        def __init__(self) -> None:
            self.batch = None

        def add(self, _obj) -> None:
            if getattr(_obj, "__tablename__", "") == "question_draft_batches":
                self.batch = _obj
            elif getattr(_obj, "__tablename__", "") == "question_drafts" and self.batch is not None:
                self.batch.questions.append(_obj)
            return None

        async def commit(self) -> None:
            return None

        async def refresh(self, _obj) -> None:
            return None

        async def execute(self, _query):
            batch = self.batch

            class _Result:
                def scalar_one(self_inner):
                    return batch

            return _Result()

    session = DummySession()
    service = AIQuestionService(session)  # type: ignore[arg-type]
    batch_in = QuestionDraftBatchCreate(
        topic="Technology",
        domain="Technology",
        difficulty="beginner",
        prompt="Generate the Question that have been asked few more time in TCS NQT exams based on computer packages",
        count=1,
    )

    batch = __import__("asyncio").run(service.generate_draft(batch_in, "user-1"))

    assert batch.questions
    assert "Generate the Question" not in batch.questions[0].question_text
    assert "Technology" in batch.questions[0].question_text
