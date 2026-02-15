from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema."""

    name: str
    email: EmailStr


class UserResponse(UserBase):
    """User response schema."""

    id: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
