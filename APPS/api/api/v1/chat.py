from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

# Fixed & Simplified Imports
from core.deps import get_current_user, get_db          # Removed get_current_org (doesn't exist)
from core.exceptions import AppError
from services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatStreamRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    model: str | None = None
    knowledge_base_ids: list[str] = []
    enable_memory: bool = True
    enable_rag: bool = True


async def _event_stream(
    generator: AsyncIterator[dict],
) -> AsyncIterator[str]:
    """
    Converts async generator into proper Server-Sent Events (SSE) format.
    """
    try:
        async for chunk in generator:
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"
    except asyncio.CancelledError:
        yield f"data: {json.dumps({'error': 'Stream cancelled'})}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'error': str(exc)})}\n\n"


@router.post("/stream")
async def stream_chat(
    body: ChatStreamRequest,
    request: Request,
    current_user=Depends(get_current_user),
    # current_org=Depends(get_current_org),   # Commented out - function doesn't exist yet
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Main streaming chat endpoint for CAT AI.
    """
    service = ChatService(db)

    try:
        token_stream = service.stream(
            user_id=str(current_user.id),
            # org_id=str(current_org.id),       # Commented out until get_current_org is implemented
            message=body.message,
            conversation_id=body.conversation_id,
            model=body.model,
            knowledge_base_ids=body.knowledge_base_ids,
            enable_memory=body.enable_memory,
            enable_rag=body.enable_rag,
        )
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(exc)}"
        )

    return StreamingResponse(
        _event_stream(token_stream),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )