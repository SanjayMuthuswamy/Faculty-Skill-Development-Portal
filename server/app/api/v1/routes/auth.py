"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_session
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.schemas.user import User
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """
    Login endpoint.
    
    Returns access token and refresh token.
    """
    auth_service = AuthService(session)
    user = await auth_service.authenticate_user(login_data)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    tokens = auth_service.create_tokens(user)
    return tokens


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current user information.
    
    Requires valid access token.
    """
    return current_user


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> ResetPasswordResponse:
    """
    Reset password using email and a new password.
    """
    auth_service = AuthService(session)
    updated = await auth_service.reset_password(payload.email, payload.new_password)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return ResetPasswordResponse(message="Password reset successful")
