
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from sqlalchemy.orm import selectinload

from app.models.faculty_profile import FacultyProfile
from app.models.attempt import Attempt
from app.models.faculty_skill import FacultySkill
from app.models.growth_plan import GrowthPlan
from app.models.performance_analysis import PerformanceAnalysis
from app.schemas.analytics import FacultyAnalytics, DepartmentSummary

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_department_summary(self) -> List[DepartmentSummary]:
        result = await self.db.execute(
            select(FacultyProfile)
            .options(
                selectinload(FacultyProfile.attempts),
                selectinload(FacultyProfile.growth_plans),
                selectinload(FacultyProfile.skills),
                selectinload(FacultyProfile.enrollments)
            )
        )
        profiles = result.scalars().all()
        
        dept_stats = {}
        for p in profiles:
            dept = p.department or "General"
            if dept not in dept_stats:
                dept_stats[dept] = {
                    "faculty_count": 0,
                    "total_attempts": 0,
                    "total_accuracy": 0.0,
                    "faculty_with_plan": 0,
                    "faculty_with_verified": 0,
                    "total_enrollments": 0
                }
            
            s = dept_stats[dept]
            s["faculty_count"] += 1
            s["total_attempts"] += len(p.attempts)
            s["total_enrollments"] += len(p.enrollments)
            
            if p.attempts:
                avg_acc = sum(a.score or 0.0 for a in p.attempts) / len(p.attempts)
                s["total_accuracy"] += avg_acc
            
            if any(gp.status == "ACTIVE" for gp in p.growth_plans):
                s["faculty_with_plan"] += 1
                
            if any(fs.status == "VERIFIED" for fs in p.skills):
                s["faculty_with_verified"] += 1

        return [
            DepartmentSummary(
                department=dept,
                faculty_count=s["faculty_count"],
                avg_accuracy=s["total_accuracy"] / s["faculty_count"] if s["faculty_count"] > 0 else 0.0,
                total_attempts=s["total_attempts"],
                total_enrollments=s["total_enrollments"],
                plan_adoption_rate=(s["faculty_with_plan"] / s["faculty_count"] * 100) if s["faculty_count"] > 0 else 0.0,
                verified_skills_rate=(s["faculty_with_verified"] / s["faculty_count"] * 100) if s["faculty_count"] > 0 else 0.0
            ) for dept, s in dept_stats.items()
        ]

    async def get_faculty_analytics(self, faculty_id: str) -> Optional[FacultyAnalytics]:
        result = await self.db.execute(
            select(FacultyProfile)
            .where(FacultyProfile.id == faculty_id)
            .options(
                selectinload(FacultyProfile.user),
                selectinload(FacultyProfile.attempts),
                selectinload(FacultyProfile.growth_plans),
                selectinload(FacultyProfile.skills)
            )
        )
        p = result.scalar_one_or_none()
        if not p:
            return None
        
        # Get the latest performance analysis for this faculty's user
        analysis_result = await self.db.execute(
            select(PerformanceAnalysis)
            .where(PerformanceAnalysis.user_id == p.user_id)
            .order_by(PerformanceAnalysis.created_at.desc())
            .limit(1)
        )
        latest_analysis = analysis_result.scalar_one_or_none()
        
        avg_acc = 0.0
        if p.attempts:
            avg_acc = sum(a.accuracy or 0.0 for a in p.attempts) / len(p.attempts)
            
        active_plan = next((gp for gp in p.growth_plans if gp.status == "ACTIVE"), None)
        progress = active_plan.progress_percentage if active_plan else 0.0
        
        verified_count = sum(1 for fs in p.skills if fs.status == "VERIFIED")
        
        return FacultyAnalytics(
            faculty_id=p.id,
            faculty_name=p.user.name,
            department=p.department,
            verified_skills_count=verified_count,
            attempts_count=len(p.attempts),
            avg_accuracy=avg_acc,
            active_plan_progress=progress,
            top_gap=latest_analysis.weaknesses if latest_analysis else None,
            strengths=latest_analysis.strengths if latest_analysis else None,
            weaknesses=latest_analysis.weaknesses if latest_analysis else None,
            recommendations=latest_analysis.recommendations if latest_analysis else []
        )
