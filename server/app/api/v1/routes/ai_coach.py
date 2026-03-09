
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from app.api.v1.deps import get_current_user, get_session
from app.models.user import User
from app.services.ai_coach_service import AICoachService

router = APIRouter(tags=["ai-coach"])


class ChatMessageIn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessageIn] = []


class ChatAction(BaseModel):
    kind: str
    label: str
    url: str
    description: str = ""


class ChatResponse(BaseModel):
    reply: str
    actions: List[ChatAction] = []


@router.post("/chat", response_model=ChatResponse)
async def chat_with_coach(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Interactive AI coach endpoint. Accepts the user's message and conversation
    history, fetches the faculty's performance context from the DB, and returns
    a personalized coaching reply from the LLM.
    """
    if not current_user.faculty_profile:
        raise HTTPException(
            status_code=400,
            detail="Only faculty members can use the AI coach."
        )

    service = AICoachService(db)
    history = [{"role": m.role, "content": m.content} for m in request.history]

    payload = await service.chat(
        faculty_id=current_user.faculty_profile.id,
        user_message=request.message,
        history=history
    )

    return ChatResponse(reply=payload.get("reply", ""), actions=payload.get("actions", []))
