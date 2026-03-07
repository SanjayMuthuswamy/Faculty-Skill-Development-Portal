
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.attempt import Attempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.services.llm_service import LLMService


class AICoachService:
    """Builds faculty performance context and drives the AI chat coach."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    async def build_performance_context(self, faculty_id: str) -> Dict[str, Any]:
        """
        Fetch all completed attempts for the faculty and compute a structured
        performance summary that is injected into the LLM system prompt.
        """
        result = await self.db.execute(
            select(Attempt)
            .where(
                Attempt.faculty_id == faculty_id,
                Attempt.status == AttemptStatus.SUBMITTED
            )
            .options(
                selectinload(Attempt.test),
                selectinload(Attempt.answers)
            )
            .order_by(Attempt.submitted_at.desc())
        )
        attempts = result.scalars().all()

        if not attempts:
            return {"total_tests": 0, "avg_accuracy": 0, "weak_topics": [], "strong_topics": [], "recent_tests": []}

        # Aggregate per-topic stats
        topic_stats: Dict[str, Dict[str, Any]] = {}
        recent_tests = []

        for attempt in attempts:
            title = (attempt.test.title if attempt.test else None) or attempt.test_title or "Unknown"
            domain = (attempt.test.domain if attempt.test else None) or attempt.domain or "General"
            accuracy = attempt.accuracy or 0

            # Recent tests list (most recent first, already sorted)
            if len(recent_tests) < 5:
                recent_tests.append({
                    "title": title,
                    "domain": domain,
                    "accuracy": accuracy,
                    "total": attempt.total,
                    "correct": attempt.correct_count,
                    "time_seconds": attempt.time_taken_seconds,
                })

            # Per-topic rolling stats
            key = title
            if key not in topic_stats:
                topic_stats[key] = {
                    "topic": title,
                    "domain": domain,
                    "attempts": 0,
                    "total_accuracy": 0.0,
                    "total_correct": 0,
                    "total_questions": 0,
                }
            topic_stats[key]["attempts"] += 1
            topic_stats[key]["total_accuracy"] += accuracy
            topic_stats[key]["total_correct"] += attempt.correct_count
            topic_stats[key]["total_questions"] += attempt.total

        # Compute averages
        aggregated = []
        for key, stats in topic_stats.items():
            avg_acc = stats["total_accuracy"] / stats["attempts"]
            aggregated.append({
                "topic": stats["topic"],
                "domain": stats["domain"],
                "attempts": stats["attempts"],
                "avg_accuracy": avg_acc,
                "total_correct": stats["total_correct"],
                "total_questions": stats["total_questions"],
            })

        # Sort: weak (< 70%) vs strong (>= 70%)
        weak_topics = sorted(
            [t for t in aggregated if t["avg_accuracy"] < 70],
            key=lambda x: x["avg_accuracy"]  # worst first
        )
        strong_topics = sorted(
            [t for t in aggregated if t["avg_accuracy"] >= 70],
            key=lambda x: x["avg_accuracy"],
            reverse=True  # best first
        )

        overall_avg = sum(t["avg_accuracy"] for t in aggregated) / len(aggregated) if aggregated else 0

        return {
            "total_tests": len(attempts),
            "avg_accuracy": overall_avg,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "recent_tests": recent_tests,
        }

    async def chat(
        self,
        faculty_id: str,
        user_message: str,
        history: List[Dict[str, str]]
    ) -> str:
        """Run a single chat turn with the AI coach."""
        context = await self.build_performance_context(faculty_id)
        reply = await self.llm.chat_with_coach(
            user_message=user_message,
            conversation_history=history,
            performance_context=context
        )
        if not reply:
            return (
                "I'm sorry, I couldn't generate a response right now. "
                "Please try again in a moment or check if the AI service is configured."
            )
        return reply
