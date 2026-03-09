
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from sqlalchemy.orm import selectinload

from app.models.faculty_profile import FacultyProfile
from app.models.attempt import Attempt
from app.models.faculty_skill import FacultySkill
from app.models.growth_plan import GrowthPlan
from app.models.course_enrollment import CourseEnrollment
from app.models.performance_analysis import PerformanceAnalysis
from app.schemas.analytics import FacultyAnalytics, DepartmentSummary

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _clip(text: Optional[str], limit: int = 180) -> Optional[str]:
        if not text:
            return None
        normalized = " ".join(text.split())
        if len(normalized) <= limit:
            return normalized
        return normalized[: limit - 1].rstrip() + "…"

    def _build_ai_suggestion(
        self,
        profile: FacultyProfile,
        latest_analysis: Optional[PerformanceAnalysis],
        avg_accuracy: float,
    ) -> tuple[str, str]:
        if latest_analysis:
            if latest_analysis.recommendations and len(latest_analysis.recommendations) > 0:
                rec = self._clip(latest_analysis.recommendations[0])
                if rec:
                    return rec, "LLM_RECOMMENDATION"
            if latest_analysis.skill_gaps and len(latest_analysis.skill_gaps) > 0:
                gap = self._clip(latest_analysis.skill_gaps[0])
                if gap:
                    return f"Focus this week: {gap}", "LLM_SKILL_GAP"
            weak = self._clip(latest_analysis.weaknesses)
            if weak:
                return weak, "LLM_WEAKNESS"

        # Deterministic fallback when no completed analysis exists yet.
        if len(profile.attempts) == 0:
            return (
                "No assessment data yet. Start one baseline test to unlock AI recommendations.",
                "RULE_BASED",
            )

        dept = profile.department or "current domain"
        if avg_accuracy < 50:
            return (
                f"Reinforce fundamentals in {dept}: complete 2 guided practice sets before the next test.",
                "RULE_BASED",
            )
        if avg_accuracy < 70:
            return (
                f"Target medium-difficulty gaps in {dept} and schedule one timed mock test this week.",
                "RULE_BASED",
            )
        return (
            f"Performance is stable. Move to advanced {dept} tasks and maintain weekly assessment rhythm.",
            "RULE_BASED",
        )

    async def get_department_summary(self) -> List[DepartmentSummary]:
        result = await self.db.execute(
            select(FacultyProfile)
            .options(
                selectinload(FacultyProfile.attempts),
                selectinload(FacultyProfile.growth_plans),
                selectinload(FacultyProfile.skills),
                selectinload(FacultyProfile.course_enrollments)
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
            s["total_enrollments"] += len(p.course_enrollments)
            
            if p.attempts:
                avg_acc = sum(a.accuracy or 0.0 for a in p.attempts) / len(p.attempts)
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
                selectinload(FacultyProfile.skills),
                selectinload(FacultyProfile.course_enrollments)
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
        ai_suggestion, ai_source = self._build_ai_suggestion(
            profile=p,
            latest_analysis=latest_analysis,
            avg_accuracy=avg_acc,
        )
        top_gap = None
        if latest_analysis:
            if latest_analysis.skill_gaps and len(latest_analysis.skill_gaps) > 0:
                top_gap = self._clip(latest_analysis.skill_gaps[0], limit=120)
            elif latest_analysis.weaknesses:
                top_gap = self._clip(latest_analysis.weaknesses, limit=120)
        
        return FacultyAnalytics(
            faculty_id=p.id,
            faculty_name=p.user.name,
            department=p.department,
            verified_skills_count=verified_count,
            attempts_count=len(p.attempts),
            total_enrollments=len(p.course_enrollments),
            avg_accuracy=avg_acc,
            active_plan_progress=progress,
            top_gap=top_gap,
            strengths=latest_analysis.strengths if latest_analysis else None,
            weaknesses=latest_analysis.weaknesses if latest_analysis else None,
            recommendations=latest_analysis.recommendations if latest_analysis else [],
            ai_suggestion=ai_suggestion,
            ai_source=ai_source,
        )
