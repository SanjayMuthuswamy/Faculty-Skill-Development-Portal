from fastapi import APIRouter
from app.api.v1.routes import (
    auth, users, faculty, skills, programs,
    enrollments, question_packs, tests,
    attempts, growth_plans, analytics, news, health, ai_questions,
    practice_sets, roadmaps, ai_coach, courses, discussions, queries
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(faculty.router, prefix="/faculty", tags=["faculty"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(enrollments.router, prefix="/enrollments", tags=["enrollments"])
api_router.include_router(question_packs.router, prefix="/question-packs", tags=["question-packs"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(growth_plans.router, prefix="/growth-plans", tags=["growth-plans"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(ai_questions.router, prefix="/ai-questions", tags=["ai-questions"])
api_router.include_router(practice_sets.router, prefix="/practice-sets", tags=["practice-sets"])
api_router.include_router(roadmaps.router, prefix="/roadmaps", tags=["roadmaps"])
api_router.include_router(ai_coach.router, prefix="/ai-coach", tags=["ai-coach"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(discussions.router, prefix="/discussions", tags=["discussions"])
api_router.include_router(queries.router, prefix="/queries", tags=["queries"])

