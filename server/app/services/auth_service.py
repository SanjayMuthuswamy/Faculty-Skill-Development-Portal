"""Authentication service."""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    hash_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    async def authenticate_user(
        session: AsyncSession, email: str, password: str
    ) -> User | None:
        """Authenticate a user by email and password."""
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
        """Get user by email."""
        result = await session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(session: AsyncSession, user_id: str) -> User | None:
        """Get user by ID."""
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_tokens(user: User) -> TokenResponse:
        """Create access and refresh tokens for a user."""
        access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
        refresh_token = create_refresh_token(data={"sub": user.id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )
