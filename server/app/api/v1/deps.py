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
    """Get current authenticated user with faculty_profile eagerly loaded."""
    token = credentials.credentials
    payload = decode_token(token, settings.JWT_ACCESS_SECRET)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user_id: str = payload.get("sub")
    # Get user with faculty_profile eagerly loaded for FACULTY users
    user = await AuthService.get_user_by_id(session, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # If this is a faculty user, ensure faculty_profile is eagerly loaded
    # This prevents lazy loading errors in async context
    if user.role == UserRole.FACULTY and user.faculty_profile is None:
        from app.models.faculty_profile import FacultyProfile
        from sqlalchemy.future import select
        res = await session.execute(
            select(FacultyProfile).where(FacultyProfile.user_id == user.id)
        )
        user.faculty_profile = res.scalar_one_or_none()
        
    return user


def require_role(*allowed_roles: UserRole):
    """Dependency to enforce role-based access control.
    
    Ensures the current user has one of the required roles.
    Handles both enum and string role values for robustness.
    """
    allowed_values = {r if isinstance(r, str) else r.value for r in allowed_roles}

    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        # Normalize user role: convert enum to string value if needed
        user_role_value = (
            current_user.role 
            if isinstance(current_user.role, str) 
            else current_user.role.value
        )
        
        if user_role_value not in allowed_values:
            logger.warning(
                f"RBAC DENIED: user='{current_user.email}' "
                f"role='{user_role_value}' "
                f"required={sorted(allowed_values)}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {' or '.join(sorted(allowed_values))}",
            )
        
        logger.debug(f"RBAC OK: user='{current_user.email}' role='{user_role_value}'")
        return current_user

    return check_role
