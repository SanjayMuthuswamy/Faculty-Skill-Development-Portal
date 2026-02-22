from typing import Any, List, Dict
from fastapi import APIRouter, Depends
from app.api import deps
from app.models.user import User

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Get dashboard stats (Mock Implementation).
    """
    return {
        "total_skills": 15,
        "verified_skills": 8,
        "programs_enrolled": 2,
        "programs_completed": 1,
        "average_assessment_score": 85.5
    }
