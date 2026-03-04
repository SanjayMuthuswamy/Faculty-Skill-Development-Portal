
from typing import Optional
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

    async def generate(self, user_id: str, skill: str, weeks: int, hours_per_week: int, current_level: str = "beginner") -> Roadmap:
        """Generate a new learning roadmap using AI and persist it."""
        logger.info(f"--- [Roadmap] Generating roadmap for user={user_id}, skill={skill}, weeks={weeks} ---")

        # Call LLM
        ai_result = await self.llm.generate_learning_roadmap(
            skill=skill, weeks=weeks, hours_per_week=hours_per_week, current_level=current_level
        )

        # Create roadmap record
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
                week = RoadmapWeek(
                    id=str(uuid4()),
                    roadmap_id=roadmap.id,
                    week_number=week_ai.week,
                    goals=week_ai.goals,
                    topics=week_ai.topics,
                    resources=[r.model_dump() for r in week_ai.resources],
                    practice=week_ai.practice,
                )
                self.db.add(week)

                # Create trackable items for goals
                for idx, _ in enumerate(week_ai.goals):
                    self.db.add(RoadmapItem(
                        id=str(uuid4()),
                        week_id=week.id,
                        item_type="goal",
                        item_index=idx,
                        completed=False,
                    ))

                # Create trackable items for practice
                for idx, _ in enumerate(week_ai.practice):
                    self.db.add(RoadmapItem(
                        id=str(uuid4()),
                        week_id=week.id,
                        item_type="practice",
                        item_index=idx,
                        completed=False,
                    ))
        else:
            logger.warning("--- [Roadmap] AI failed, generating fallback roadmap ---")
            for i in range(1, weeks + 1):
                goals = [
                    f"Study {skill} fundamentals — Week {i}",
                    f"Complete practice exercises for {skill}",
                ]
                practice = [
                    f"Build a mini-project related to {skill}",
                    f"Review and summarise Week {i} learnings",
                ]
                week = RoadmapWeek(
                    id=str(uuid4()),
                    roadmap_id=roadmap.id,
                    week_number=i,
                    goals=goals,
                    topics=[f"{skill} — Part {i}"],
                    resources=[{"title": f"{skill} documentation", "url": "https://google.com/search?q=" + skill.replace(" ", "+")}],
                    practice=practice,
                )
                self.db.add(week)
                for idx in range(len(goals)):
                    self.db.add(RoadmapItem(id=str(uuid4()), week_id=week.id, item_type="goal", item_index=idx))
                for idx in range(len(practice)):
                    self.db.add(RoadmapItem(id=str(uuid4()), week_id=week.id, item_type="practice", item_index=idx))

        await self.db.commit()
        logger.info(f"--- [Roadmap] Roadmap {roadmap.id} created ---")
        return await self.get_roadmap(roadmap.id, user_id)

    async def get_roadmap(self, roadmap_id: str, user_id: str) -> Optional[Roadmap]:
        """Load a roadmap with all weeks and items."""
        result = await self.db.execute(
            select(Roadmap)
            .where(Roadmap.id == roadmap_id, Roadmap.user_id == user_id)
            .options(
                selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items)
            )
        )
        return result.scalar_one_or_none()

    async def get_latest_roadmap(self, user_id: str) -> Optional[Roadmap]:
        """Get the most recent roadmap for a user."""
        result = await self.db.execute(
            select(Roadmap)
            .where(Roadmap.user_id == user_id)
            .options(
                selectinload(Roadmap.weekly_plan).selectinload(RoadmapWeek.items)
            )
            .order_by(Roadmap.created_at.desc())
        )
        return result.scalars().first()

    async def update_progress(
        self, roadmap_id: str, user_id: str,
        week: int, item_type: str, item_index: int, completed: bool
    ) -> bool:
        """Toggle completion for a single roadmap item."""
        # Verify ownership
        roadmap = await self.get_roadmap(roadmap_id, user_id)
        if not roadmap:
            return False

        # Find the week
        target_week = None
        for w in roadmap.weekly_plan:
            if w.week_number == week:
                target_week = w
                break

        if not target_week:
            return False

        # Find and update the item
        for item in target_week.items:
            if item.item_type == item_type and item.item_index == item_index:
                item.completed = completed
                await self.db.commit()
                return True

        return False
