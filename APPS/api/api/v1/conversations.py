from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_user_id, get_workspace_id, get_db
from core.exceptions import AppError, to_http_exception
from services.conversation_service import ConversationService

router = APIRouter(
    prefix="/conversations",
    tags=["conversations"],
)

# ── Pydantic Request/Response Data Schemas (Pydantic V2 Compliant) ──

class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(None, description="Optional title of the conversation thread")
    model_id: Optional[str] = Field(None, description="Target AI model identifier selection")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt override instructions")


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

    # Updated to strict Pydantic V2 standard syntax
    model_config = {
        "from_attributes": True
    }


class ConversationResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    title: str
    model_id: str
    created_at: str

    # Updated to strict Pydantic V2 standard syntax
    model_config = {
        "from_attributes": True
    }


class PaginatedConversationResponse(BaseModel):
    items: List[ConversationResponse]
    total: int
    page: int
    page_size: int


class PaginatedMessageResponse(BaseModel):
    items: List[MessageResponse]
    total: int
    page: int
    page_size: int


# ── Dependency Provider for Service Tier ───────────────────────────

async def get_conversation_service(db: AsyncSession = Depends(get_db)) -> ConversationService:
    """
    Dependency injector providing an isolated conversation business execution instance.
    """
    return ConversationService(db)


# ── Route Declarations ──────────────────────────────────────────────

@router.get("", response_model=PaginatedConversationResponse, status_code=status.HTTP_200_OK)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service: ConversationService = Depends(get_conversation_service),
):
    """
    Retrieves a paginated collection of conversation records scoped to the active workspace tenant.
    """
    try:
        conversations, total = await service.list(
            workspace_id=workspace_id,
            user_id=user_id,
            page=page,
            page_size=page_size,
        )

        return {
            "items": conversations,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service: ConversationService = Depends(get_conversation_service),
):
    """
    Initializes a new isolated conversation pipeline thread within the caller's workspace context.
    """
    try:
        conversation = await service.create(
            workspace_id=workspace_id,
            user_id=user_id,
            title=body.title,
            model_id=body.model_id,
            system_prompt=body.system_prompt,
        )
        return conversation
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("/{conversation_id}/messages", response_model=PaginatedMessageResponse, status_code=status.HTTP_200_OK)
async def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    workspace_id: str = Depends(get_workspace_id),
    service: ConversationService = Depends(get_conversation_service),
):
    """
    Fetches sequential trace logs/messages belonging to an authorized multi-tenant workspace conversation.
    """
    try:
        messages, total = await service.get_messages(
            conversation_id=conversation_id,
            workspace_id=workspace_id,
            page=page,
            page_size=page_size,
        )

        return {
            "items": messages,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as exc:
        raise to_http_exception(exc)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service: ConversationService = Depends(get_conversation_service),
) -> Response:
    """
    Hard-deletes an active conversation instance and its execution assets from the platform.
    """
    try:
        await service.delete(
            conversation_id=conversation_id,
            workspace_id=workspace_id,
            user_id=user_id,
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except AppError as exc:
        raise to_http_exception(exc)