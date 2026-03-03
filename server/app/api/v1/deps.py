"""Dependencies for API routes."""

import logging
from typing import Annotated

logger = logging.getLogger(__name__)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.config import settings
from app.db.session import get_session
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: AsyncSession = Depends(get_session),
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token, settings.JWT_ACCESS_SECRET)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id: str = payload.get("sub")
    user = await AuthService.get_user_by_id(session, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Explicitly load faculty_profile if not already loaded (failsafe)
    if not user.faculty_profile and user.role == UserRole.FACULTY:
        from app.models.faculty_profile import FacultyProfile
        from sqlalchemy.future import select
        res = await session.execute(select(FacultyProfile).where(FacultyProfile.user_id == user.id))
        user.faculty_profile = res.scalar_one_or_none()
        
    return user


def require_role(*allowed_roles: UserRole):
    """Dependency factory to require specific roles.
    
    Normalizes both the user's role and the allowed roles to their string values
    before comparing, making the check robust against StrEnum edge cases.
    """
    # Pre-compute the allowed role values once at import time (not per-request)
    allowed_values = {r.value if hasattr(r, 'value') else str(r) for r in allowed_roles}

    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        # Normalize user role: handle both StrEnum and plain str from DB
        user_role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        
        if user_role_value not in allowed_values:
            logger.warning(
                f"RBAC DENIED: user='{current_user.email}' "
                f"role='{user_role_value}' "
                f"required={sorted(allowed_values)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires role: {' or '.join(sorted(allowed_values))}. "
                       f"Your role is: {user_role_value}",
            )
        
        logger.debug(f"RBAC OK: user='{current_user.email}' role='{user_role_value}'")
        return current_user

    return check_role
