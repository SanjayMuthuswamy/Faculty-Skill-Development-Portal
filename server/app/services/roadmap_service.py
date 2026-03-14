from typing import List, Optional
from uuid import uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.roadmap import Roadmap
from app.models.roadmap_week import RoadmapWeek
from app.models.roadmap_item import RoadmapItem
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class RoadmapService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    def _normalize_practice_items(self, practice: List[str]) -> List[str]:
        seen = set()
        cleaned: List[str] = []
        for raw in practice or []:
            item = " ".join(str(raw).split()).strip()
            if not item:
                continue
            key = item.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(item)
        return cleaned

    def _ensure_rigorous_practice(
        self,
        skill: str,
        week_number: int,
        topics: List[str],
        practice: List[str],
    ) -> List[str]:
        items = self._normalize_practice_items(practice)
        topic_hint = topics[0] if topics else f"{skill} week {week_number}"

        has_test = any(item.upper().startswith("TEST:") for item in items)
        has_build = any(item.upper().startswith("BUILD:") for item in items)
        has_review = any(item.upper().startswith("REVIEW:") for item in items)

        if not has_test:
            items.append(f"TEST: Take a timed 20-question practice test on {topic_hint}; target score >= 75%.")
        if not has_build:
            items.append(f"BUILD: Implement a mini task for {topic_hint} and submit code notes/screenshots.")
        if not has_review:
            items.append("REVIEW: Complete peer/self review with 3 mistakes, 3 fixes, and a short teach-back summary.")

        if len(items) < 4:
            items.append("REVIEW: Benchmark this week vs last week using score, speed, and confidence metrics.")

        return items[:6]

    async def _upgrade_existing_roadmap_practice(self, roadmap: Roadmap) -> bool:
        """Backfill older roadmap weeks with TEST/BUILD/REVIEW practice items."""
        changed = False
        for week in (roadmap.weekly_plan or []):
            upgraded_practice = self._ensure_rigorous_practice(
                skill=roadmap.skill,
                week_number=week.week_number,
                topics=week.topics or [],
                practice=week.practice or [],
            )

            if upgraded_practice != (week.practice or []):
                week.practice = upgraded_practice
                changed = True

            existing_practice_indices = {
                item.item_index
                for item in (week.items or [])
                if item.item_type == "practice"
            }
            for idx in range(len(upgraded_practice)):
                if idx not in existing_practice_indices:
                    self.db.add(
                        RoadmapItem(
                            id=str(uuid4()),
                            week_id=week.id,
                            item_type="practice",
                            item_index=idx,
                            completed=False,
                        )
                    )
                    changed = True

        if changed:
            await self.db.commit()
        return changed

    async def generate(self, user_id: str, skill: str, weeks: int, hours_per_week: int, current_level: str = "beginner") -> Roadmap:
        """Generate a new learning roadmap using AI and persist it."""
        logger.info(f"--- [Roadmap] Generating roadmap for user={user_id}, skill={skill}, weeks={weeks} ---")

        ai_result = await self.llm.generate_learning_roadmap(
            skill=skill,
            weeks=weeks,
            hours_per_week=hours_per_week,
            current_level=current_level,
        )

        roadmap = Roadmap(
            id=str(uuid4()),
            user_id=user_id,
            skill=skill,
            weeks=weeks,
            hours_per_week=hours_per_week,
            current_level=current_level,
        )
        self.db.add(roadmap)

        if ai_result and ai_result.weekly_plan:
            logger.info(f"--- [Roadmap] AI generated {len(ai_result.weekly_plan)} weeks ---")
            for week_ai in ai_result.weekly_plan:
                topics = week_ai.topics or []
                practice = self._ensure_rigorous_practice(skill, week_ai.week, topics, week_ai.practice or [])

                week = RoadmapWeek(
                    id=str(uuid4()),
                    roadmap_id=roadmap.id,
                    week_number=week_ai.week,
                    goals=week_ai.goals,
                    topics=topics,
                    resources=[r.model_dump() for r in week_ai.resources],
                    practice=practice,
                )
                self.db.add(week)

                for idx, _ in enumerate(week_ai.goals):
                    self.db.add(
                        RoadmapItem(
                            id=str(uuid4()),
                            week_id=week.id,
                            item_type="goal",
                            item_index=idx,
                            completed=False,
                        )
                    )

                for idx, _ in enumerate(practice):
                    self.db.add(
                        RoadmapItem(
                            id=str(uuid4()),
                            week_id=week.id,
                            item_type="practice",
                            item_index=idx,
                            completed=False,
                        )
                    )
        else:
            logger.error("--- [Roadmap] AI generation failed ---")
            raise RuntimeError(
                "Roadmap generation is temporarily unavailable. "
                "Please try again after AI service is restored."
            )

        await self.db.commit()
        logger.info(f"--- [Roadmap] Roadmap {roadmap.id} created ---")
        return await self.get_roadmap(roadmap.id, user_id)

    async def get_roadmap(self, roadmap_id: str, user_id: str) -> Optional[Roadmap]:
        """Load a roadmap with all weeks and items."""
        result = await self.db.execute(
            select(Roadmap)
            .where(Roadmap.id == roadmap_id, Roadmap.user_id == user_id)
            .options(selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items))
        )
        roadmap = result.scalar_one_or_none()
        if roadmap:
            changed = await self._upgrade_existing_roadmap_practice(roadmap)
            if changed:
                result = await self.db.execute(
                    select(Roadmap)
                    .where(Roadmap.id == roadmap_id, Roadmap.user_id == user_id)
                    .options(selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items))
                )
                roadmap = result.scalar_one_or_none()
        return roadmap

    async def get_latest_roadmap(self, user_id: str) -> Optional[Roadmap]:
        """Get the most recent roadmap for a user."""
        result = await self.db.execute(
            select(Roadmap)
            .where(Roadmap.user_id == user_id)
            .options(selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items))
            .order_by(Roadmap.created_at.desc())
        )
        roadmap = result.scalars().first()
        if roadmap:
            changed = await self._upgrade_existing_roadmap_practice(roadmap)
            if changed:
                result = await self.db.execute(
                    select(Roadmap)
                    .where(Roadmap.id == roadmap.id, Roadmap.user_id == user_id)
                    .options(selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items))
                )
                roadmap = result.scalar_one_or_none()
        return roadmap

    async def update_progress(
        self,
        roadmap_id: str,
        user_id: str,
        week: int,
        item_type: str,
        item_index: int,
        completed: bool,
    ) -> bool:
        """Toggle completion for a single roadmap item."""
        roadmap = await self.get_roadmap(roadmap_id, user_id)
        if not roadmap:
            return False

        target_week = None
        for w in roadmap.weekly_plan:
            if w.week_number == week:
                target_week = w
                break

        if not target_week:
            return False

        for item in target_week.items:
            if item.item_type == item_type and item.item_index == item_index:
                item.completed = completed
                await self.db.commit()
                return True

        return False
