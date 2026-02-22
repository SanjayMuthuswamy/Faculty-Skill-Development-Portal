from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.base import CRUDBase
from app.models.growth import GrowthPlan
from app.schemas.growth import GrowthPlanCreate, GrowthPlanUpdate

class CRUDGrowthPlan(CRUDBase[GrowthPlan, GrowthPlanCreate, GrowthPlanUpdate]):
    async def get_by_user(self, db: AsyncSession, *, user_id: str) -> List[GrowthPlan]:
        result = await db.execute(select(GrowthPlan).filter(GrowthPlan.user_id == user_id))
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: GrowthPlanCreate, user_id: str) -> GrowthPlan:
        db_obj = GrowthPlan(
            id=str(uuid.uuid4()),
            user_id=user_id,
            **obj_in.model_dump()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

growth_plan = CRUDGrowthPlan(GrowthPlan)
