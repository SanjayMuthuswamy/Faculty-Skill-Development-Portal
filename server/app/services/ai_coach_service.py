
from typing import List, Dict, Any, Optional
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.attempt import Attempt, AttemptStatus
from app.models.attempt_answer import AttemptAnswer
from app.models.test import Test
from app.models.course import Course
from app.services.llm_service import LLMService


class AICoachService:
    """Builds faculty performance context and drives the AI chat coach."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    @staticmethod
    def _requires_guided_actions(user_message: str) -> bool:
        prompt = (user_message or "").lower()
        keywords = [
            "weak", "weakness", "improve", "study", "material", "resource",
            "practice", "test", "quiz", "where am i weak", "what should i study",
        ]
        return any(k in prompt for k in keywords)

    @staticmethod
    def _score_text_match(text: str, terms: List[str]) -> int:
        normalized = (text or "").lower()
        score = 0
        for term in terms:
            t = (term or "").strip().lower()
            if t and t in normalized:
                score += 1
        return score

    async def _build_guided_actions(
        self,
        user_message: str,
        performance_context: Dict[str, Any],
    ) -> List[Dict[str, str]]:
        if not self._requires_guided_actions(user_message):
            return []

        weak_topics = performance_context.get("weak_topics", []) or []
        terms: List[str] = []
        for topic in weak_topics[:3]:
            if topic.get("topic"):
                terms.append(topic["topic"])
            if topic.get("domain"):
                terms.append(topic["domain"])

        if not terms:
            # Generic fallback if there is no performance history yet.
            return [
                {
                    "kind": "test",
                    "label": "Take an official baseline test",
                    "url": "/faculty/tests",
                    "description": "Start with an official test to unlock weakness-based suggestions.",
                },
                {
                    "kind": "resource",
                    "label": "Open learning resources",
                    "url": "/faculty/resources",
                    "description": "Browse materials by topic and build a study plan.",
                },
            ]

        # Match official tests by weak topic/domain.
        tests_res = await self.db.execute(select(Test))
        tests = tests_res.scalars().all()
        ranked_tests = []
        for test in tests:
            haystack = f"{test.title} {test.description or ''} {test.domain or ''}"
            score = self._score_text_match(haystack, terms)
            if score > 0:
                ranked_tests.append((score, test))
        ranked_tests.sort(key=lambda item: item[0], reverse=True)

        # Match published courses as study materials.
        courses_res = await self.db.execute(
            select(Course).where(Course.is_published == True)
        )
        courses = courses_res.scalars().all()
        ranked_courses = []
        for course in courses:
            tags_blob = " ".join(course.tags or [])
            haystack = f"{course.title} {course.description or ''} {tags_blob}"
            score = self._score_text_match(haystack, terms)
            if score > 0:
                ranked_courses.append((score, course))
        ranked_courses.sort(key=lambda item: item[0], reverse=True)

        actions: List[Dict[str, str]] = []
        for _, test in ranked_tests[:3]:
            actions.append(
                {
                    "kind": "test",
                    "label": f"Take Test: {test.title}",
                    "url": f"/faculty/tests/{test.id}/play",
                    "description": f"Pass mark: {test.pass_marks}% | Time: {test.time_limit_minutes} minutes",
                }
            )

        for _, course in ranked_courses[:2]:
            actions.append(
                {
                    "kind": "course",
                    "label": f"Study Course: {course.title}",
                    "url": f"/faculty/courses/{course.id}",
                    "description": "Recommended material aligned to your weak areas.",
                }
            )

        # Add one external resource shortcut tied to the weakest topic.
        weakest_label = weak_topics[0].get("topic") or weak_topics[0].get("domain")
        if weakest_label:
            query = quote_plus(f"{weakest_label} tutorial")
            actions.append(
                {
                    "kind": "resource",
                    "label": f"External Material: {weakest_label}",
                    "url": f"https://www.google.com/search?q={query}",
                    "description": "Open curated web resources for additional practice.",
                }
            )

        return actions

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
    ) -> Dict[str, Any]:
        """Run a single chat turn with the AI coach."""
        context = await self.build_performance_context(faculty_id)
        reply = await self.llm.chat_with_coach(
            user_message=user_message,
            conversation_history=history,
            performance_context=context
        )
        actions = await self._build_guided_actions(
            user_message=user_message,
            performance_context=context
        )
        if not reply:
            reply = (
                "I'm sorry, I couldn't generate a response right now. "
                "Please try again in a moment or check if the AI service is configured."
            )

        return {"reply": reply, "actions": actions}
