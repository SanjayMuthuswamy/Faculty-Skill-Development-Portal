
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.future import select

from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    async def authenticate_user(self, login_data: LoginRequest) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .where(User.email == login_data.email.lower())
            .options(selectinload(User.faculty_profile))
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        if not verify_password(login_data.password, user.password_hash):
            return None
        return user

    def create_tokens(self, user: User) -> TokenResponse:
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    async def reset_password(self, email: str, new_password: str) -> bool:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()
        if not user:
            return False

        user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        return True

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.faculty_profile))
        )
        return result.scalar_one_or_none()
