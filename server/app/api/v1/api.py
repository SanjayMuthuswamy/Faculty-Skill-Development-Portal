"""API v1 routes aggregation."""

from fastapi import APIRouter

from app.api.v1.routes import auth, health

router = APIRouter(prefix="/api/v1")

router.include_router(health.router, prefix="/health")
router.include_router(auth.router, prefix="/auth")
