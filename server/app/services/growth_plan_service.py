
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.growth_plan import GrowthPlan, GrowthPlanStatus
from app.models.growth_week import GrowthWeek
from app.models.week_task import WeekTask
from app.schemas.growth_plan import GrowthPlanCreate

from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class GrowthPlanService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMService()

    async def create_plan(self, faculty_id: str, plan_in: GrowthPlanCreate) -> GrowthPlan:
        # Check active plan - use .first() to avoid MultipleResultsFound crash
        active_res = await self.db.execute(select(GrowthPlan).filter(
            GrowthPlan.faculty_id == faculty_id,
            GrowthPlan.status == GrowthPlanStatus.ACTIVE
        ))
        existing = active_res.scalars().first()
        if existing:
            raise ValueError("Faculty already has an active growth plan.")

        logger.info(f"--- [GrowthPlan] Creating plan for faculty={faculty_id}, skill={plan_in.target_skill} ---")

        plan = GrowthPlan(
            id=str(uuid4()),
            faculty_id=faculty_id,
            status=GrowthPlanStatus.ACTIVE,
            **plan_in.model_dump()
        )
        self.db.add(plan)
        
        # Try AI generation first
        roadmap = await self.llm.generate_roadmap(
            skill=plan_in.target_skill,
            domain=plan_in.domain,
            current_level=plan_in.current_level,
            target_level=plan_in.target_level,
            weekly_hours=plan_in.weekly_hours
        )

        if roadmap and roadmap.weeks:
            logger.info(f"--- [GrowthPlan] AI generated {len(roadmap.weeks)} weeks ---")
            # Use AI generated roadmap
            for i, week_ai in enumerate(roadmap.weeks):
                week = GrowthWeek(
                    id=str(uuid4()),
                    plan_id=plan.id,
                    week_number=i + 1,
                    title=week_ai.title,
                    required_practice_count=week_ai.required_practice_count,
                    required_min_avg_score=week_ai.required_min_avg_score
                )
                self.db.add(week)
                
                for t_label in week_ai.tasks:
                    task = WeekTask(
                        id=str(uuid4()),
                        week_id=week.id,
                        label=t_label,
                        done=False
                    )
                    self.db.add(task)
        else:
            logger.error("--- [GrowthPlan] AI roadmap generation failed ---")
            raise RuntimeError(
                "Growth plan generation is temporarily unavailable. "
                "Please try again after AI service is restored."
            )
                
        await self.db.commit()
        await self.db.refresh(plan)
        
        logger.info(f"--- [GrowthPlan] Plan {plan.id} created and committed ---")
        # Re-fetch with relationships loaded to avoid lazy-loading issues in async context
        return await self.get_plan_by_id(plan.id)

    async def get_active_plan(self, faculty_id: str) -> Optional[GrowthPlan]:
        result = await self.db.execute(
            select(GrowthPlan)
            .where(GrowthPlan.faculty_id == faculty_id, GrowthPlan.status == GrowthPlanStatus.ACTIVE)
            .options(
                selectinload(GrowthPlan.weeks).selectinload(GrowthWeek.tasks)
            )
            .order_by(GrowthPlan.created_at.desc())
        )
        return result.scalars().first()

    async def get_plan_by_id(self, plan_id: str) -> Optional[GrowthPlan]:
        result = await self.db.execute(
            select(GrowthPlan)
            .where(GrowthPlan.id == plan_id)
            .options(
                selectinload(GrowthPlan.weeks).selectinload(GrowthWeek.tasks)
            )
        )
        return result.scalar_one_or_none()

    async def list_plans(self, skip: int = 0, limit: int = 100) -> List[GrowthPlan]:
        result = await self.db.execute(
            select(GrowthPlan)
            .offset(skip)
            .limit(limit)
            .options(selectinload(GrowthPlan.weeks))
        )
        return result.scalars().all()

    async def update_task_status(self, task_id: str, done: bool) -> bool:
        result = await self.db.execute(
            select(WeekTask)
            .where(WeekTask.id == task_id)
            .options(selectinload(WeekTask.week).selectinload(GrowthWeek.plan))
        )
        task = result.scalar_one_or_none()
        
        if not task:
            return False
            
        task.done = done
        
        # Check if all tasks in the week are done to auto-complete the week
        week = task.week
        res_tasks = await self.db.execute(select(WeekTask).where(WeekTask.week_id == week.id))
        all_tasks = res_tasks.scalars().all()
        
        if all(t.done for t in all_tasks):
            await self.complete_week(week.id)
        else:
            # Re-calculate progress if tasks are toggled
            plan = week.plan
            # Refetch all weeks and tasks to be sure
            res_weeks = await self.db.execute(
                select(GrowthWeek)
                .where(GrowthWeek.plan_id == plan.id)
                .options(selectinload(GrowthWeek.tasks))
            )
            weeks = res_weeks.scalars().all()
            total_tasks = sum(len(w.tasks) for w in weeks)
            done_tasks = sum(sum(1 for t in w.tasks if t.done) for w in weeks)
            
            if total_tasks > 0:
                plan.progress_percentage = (done_tasks / total_tasks) * 100
            
            await self.db.commit()
            
        return True

    async def complete_week(self, week_id: str) -> bool:
        result = await self.db.execute(
            select(GrowthWeek)
            .where(GrowthWeek.id == week_id)
            .options(
                selectinload(GrowthWeek.tasks),
                selectinload(GrowthWeek.plan).selectinload(GrowthPlan.weeks),
            )
        )
        week = result.scalar_one_or_none()
        
        if not week or week.completed:
            return False

        # A week can only be completed if all its tasks are done.
        if week.tasks and not all(t.done for t in week.tasks):
            return False

        week.completed = True
        week.completed_at = datetime.now(timezone.utc)
        
        # Update plan progress
        plan = week.plan
        total_weeks = len(plan.weeks) # This might need re-fetching if not loaded
        completed_weeks = sum(1 for w in plan.weeks if w.completed) # Optimistic count
        
        if total_weeks > 0:
            plan.progress_percentage = (completed_weeks / total_weeks) * 100
            
        if plan.progress_percentage >= 100:
            plan.status = GrowthPlanStatus.COMPLETED
            
        await self.db.commit()
        return True

    async def reset_plan(self, faculty_id: str) -> bool:
        # Delete all plans for this faculty to allow hard reset
        # Or just mark them as cancelled/deleted
        result = await self.db.execute(select(GrowthPlan).where(GrowthPlan.faculty_id == faculty_id))
        plans = result.scalars().all()
        for plan in plans:
            await self.db.delete(plan)
        
        await self.db.commit()
        return True
