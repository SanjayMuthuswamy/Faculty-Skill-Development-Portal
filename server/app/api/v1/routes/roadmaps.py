from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import traceback

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.roadmap import (
    RoadmapGenerateRequest,
    RoadmapResponse,
    RoadmapWeekSchema,
    RoadmapItemSchema,
    ResourceSchema,
    RoadmapProgressUpdate,
)
from app.services.roadmap_service import RoadmapService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["roadmaps"])


def _map_roadmap(rm) -> dict:
    """Convert ORM Roadmap to response dict."""
    return RoadmapResponse(
        id=rm.id,
        skill=rm.skill,
        weeks=rm.weeks,
        hours_per_week=rm.hours_per_week,
        current_level=rm.current_level,
        created_at=rm.created_at,
        weekly_plan=[
            RoadmapWeekSchema(
                week=w.week_number,
                goals=w.goals or [],
                topics=w.topics or [],
                resources=[ResourceSchema(**r) for r in (w.resources or [])],
                practice=w.practice or [],
                items=[
                    RoadmapItemSchema(
                        id=item.id,
                        item_type=item.item_type,
                        item_index=item.item_index,
                        completed=item.completed,
                    )
                    for item in (w.items or [])
                ],
            )
            for w in (rm.weekly_plan or [])
        ],
    )


@router.post("/", response_model=RoadmapResponse)
async def generate_roadmap(
    body: RoadmapGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Generate a personalized learning roadmap."""
    service = RoadmapService(db)
    try:
        roadmap = await service.generate(
            user_id=current_user.id,
            skill=body.skill,
            weeks=body.weeks,
            hours_per_week=body.hours_per_week,
            current_level=body.current_level,
        )
        return _map_roadmap(roadmap)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "errorCode": "ROADMAP_PROVIDER_UNAVAILABLE",
                "message": str(e),
                "details": {},
            },
        )
    except Exception as e:
        logger.error(f"Roadmap generation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "errorCode": "ROADMAP_GENERATION_FAILED",
                "message": str(e),
                "details": {},
            },
        )


@router.get("/latest", response_model=RoadmapResponse)
async def get_latest_roadmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get the user's most recent roadmap."""
    service = RoadmapService(db)
    roadmap = await service.get_latest_roadmap(current_user.id)
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "errorCode": "ROADMAP_NOT_FOUND",
                "message": "No roadmap found.",
                "details": {},
            },
        )
    return _map_roadmap(roadmap)


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Retrieve a saved roadmap by ID."""
    service = RoadmapService(db)
    roadmap = await service.get_roadmap(roadmap_id, current_user.id)
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "errorCode": "ROADMAP_NOT_FOUND",
                "message": "Roadmap not found or access denied.",
                "details": {},
            },
        )
    return _map_roadmap(roadmap)


@router.patch("/{roadmap_id}/progress")
async def update_roadmap_progress(
    roadmap_id: str,
    body: RoadmapProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update completion status of a single roadmap item."""
    service = RoadmapService(db)
    success = await service.update_progress(
        roadmap_id=roadmap_id,
        user_id=current_user.id,
        week=body.week,
        item_type=body.item_type,
        item_index=body.item_index,
        completed=body.completed,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "errorCode": "ITEM_NOT_FOUND",
                "message": "Roadmap, week, or item not found.",
                "details": {},
            },
        )
    return {"status": "success"}
