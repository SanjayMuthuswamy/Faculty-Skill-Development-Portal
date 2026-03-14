from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User, UserRole
from app.models.growth_week import GrowthWeek
from app.models.week_task import WeekTask
from app.schemas.growth_plan import GrowthPlanCreate, GrowthPlan as GrowthPlanSchema
from app.services.growth_plan_service import GrowthPlanService

router = APIRouter(tags=["growth-plans"])


def require_faculty_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.FACULTY:
        raise HTTPException(status_code=403, detail="Only faculty users can access this endpoint")
    if not current_user.faculty_profile:
        raise HTTPException(status_code=400, detail="User has no faculty profile")
    return current_user

@router.post("/", response_model=GrowthPlanSchema)
async def create_growth_plan(
    plan_in: GrowthPlanCreate,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = GrowthPlanService(db)
    try:
        plan = await service.create_plan(current_user.faculty_profile.id, plan_in)
        return plan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/me", response_model=GrowthPlanSchema)
async def get_my_active_plan(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = GrowthPlanService(db)
    plan = await service.get_active_plan(current_user.faculty_profile.id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active growth plan found")
    return plan

@router.delete("/me")
async def reset_my_plan(
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    service = GrowthPlanService(db)
    await service.reset_plan(current_user.faculty_profile.id)
    return {"status": "success"}

@router.post("/weeks/{week_id}/complete")
async def complete_week(
    week_id: str,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    week_result = await db.execute(
        select(GrowthWeek)
        .where(GrowthWeek.id == week_id)
        .options(selectinload(GrowthWeek.plan))
    )
    week = week_result.scalar_one_or_none()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found or already completed")
    if week.plan.faculty_id != current_user.faculty_profile.id:
        raise HTTPException(status_code=403, detail="Cannot modify another faculty's growth plan")

    service = GrowthPlanService(db)
    success = await service.complete_week(week_id)
    if not success:
        raise HTTPException(status_code=404, detail="Week not found or already completed")
    return {"status": "success"}

@router.patch("/tasks/{task_id}")
async def update_task_status(
    task_id: str,
    done: bool,
    current_user: User = Depends(require_faculty_user),
    db: AsyncSession = Depends(get_session)
):
    task_result = await db.execute(
        select(WeekTask)
        .where(WeekTask.id == task_id)
        .options(selectinload(WeekTask.week).selectinload(GrowthWeek.plan))
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.week.plan.faculty_id != current_user.faculty_profile.id:
        raise HTTPException(status_code=403, detail="Cannot modify another faculty's growth plan")

    service = GrowthPlanService(db)
    success = await service.update_task_status(task_id, done)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "success"}

@router.get("/", response_model=List[GrowthPlanSchema])
async def list_growth_plans(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user), # Admin or Faculty?
    db: AsyncSession = Depends(get_session)
):
    # For simplicity, admin can see all
    if current_user.role != UserRole.ADMIN:
         raise HTTPException(status_code=403, detail="Only admins can list all growth plans")
         
    service = GrowthPlanService(db)
    plans = await service.list_plans(skip=skip, limit=limit)
    return plans
