from __future__ import annotations
from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from db.repos.conversation_repo import ConversationRepo
from core.exceptions import NotFoundError, PermissionDeniedError
from core.config import settings


class ConversationService:
    def __init__(self, db: AsyncSession):
        """
        Initializes the business transaction service layer.
        
        Args:
            db: The scoped AsyncSession injected by the FastAPI controller layer.
        """
        self.db = db
        self.repo = ConversationRepo(db)

    def _safe_uuid(self, identifier: str, field_name: str) -> UUID:
        """
        Safely casts incoming string representations into safe RFC 4122 compliant UUIDs.
        """
        try:
            return UUID(str(identifier).strip())
        except ValueError:
            raise NotFoundError(entity_name=field_name, entity_id=identifier)

    async def list(
        self, 
        workspace_id: str, 
        user_id: str, 
        page: int = 1, 
        page_size: int = 20
    ) -> Tuple[List[Any], int]:
        """
        Retrieves a paginated list of conversations and a total count for a given user and workspace.
        """
        ws_uuid = self._safe_uuid(workspace_id, "Workspace")
        user_uuid = self._safe_uuid(user_id, "User")
        
        # Translate page/page_size metrics into backend limit/offset structures
        limit = max(1, page_size)
        offset = (max(1, page) - 1) * limit

        # Expecting back a structural tuple of (records_list, total_count) from repo
        conversations, total = await self.repo.list_by_workspace(
            workspace_id=ws_uuid, 
            user_id=user_uuid, 
            limit=limit, 
            offset=offset
        )
        return conversations, total

    async def create(
        self,
        workspace_id: str,
        user_id: str,
        title: Optional[str] = None,
        model_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ) -> Any:
        """
        Asynchronously provisions a fresh multi-tenant conversation session.
        """
        ws_uuid = self._safe_uuid(workspace_id, "Workspace")
        user_uuid = self._safe_uuid(user_id, "User")
        
        fallback_model = model_id or getattr(settings, "DEFAULT_MODEL", "gpt-4o")
        fallback_title = title or "New Conversation"

        conversation = await self.repo.create(
            workspace_id=ws_uuid,
            user_id=user_uuid,
            title=fallback_title,
            model_id=fallback_model,
            system_prompt=system_prompt,
        )
        
        await self.db.commit()
        return conversation

    async def get(self, workspace_id: str, conversation_id: str) -> Any:
        """
        Retrieves a singular domain record while establishing tenancy isolation.
        """
        ws_uuid = self._safe_uuid(workspace_id, "Workspace")
        conv_uuid = self._safe_uuid(conversation_id, "Conversation")

        conv = await self.repo.get_by_id(conversation_id=conv_uuid, workspace_id=ws_uuid)
        if not conv:
            raise NotFoundError(entity_name="Conversation", entity_id=conversation_id)
        return conv

    async def get_messages(
        self, 
        conversation_id: str, 
        workspace_id: str, 
        page: int = 1, 
        page_size: int = 50
    ) -> Tuple[List[Any], int]:
        """
        Fetches transactional message logs tracking sequential interaction tracing.
        """
        # Ensure the conversation exists and belongs to this workspace
        conv = await self.get(workspace_id=workspace_id, conversation_id=conversation_id)
        
        limit = max(1, page_size)
        offset = (max(1, page) - 1) * limit

        messages, total = await self.repo.get_messages_paginated(
            conversation_id=conv.id, 
            limit=limit, 
            offset=offset
        )
        return messages, total

    async def delete(self, conversation_id: str, workspace_id: str, user_id: str) -> None:
        """
        Validates ownership permissions and purges the target thread from database infrastructure.
        """
        conv = await self.get(workspace_id=workspace_id, conversation_id=conversation_id)
        
        # Verify ownership context bounds
        if str(conv.user_id) != str(user_id).strip():
            raise PermissionDeniedError("You do not have access rights to delete this conversation resource.")

        await self.repo.delete(conv)
        await self.db.commit()

    async def summarize(self, workspace_id: str, conversation_id: str) -> str:
        """
        Summarizes elder history contexts when tracking budget limits.
        """
        conv = await self.get(workspace_id=workspace_id, conversation_id=conversation_id)
        messages, _ = await self.repo.get_messages_paginated(conversation_id=conv.id, limit=100, offset=0)
        
        if len(messages) < 10:
            return conv.summary or ""

        # Placeholder summary computation engine interface
        summary = f"[Summary of {len(messages)} messages in conversation '{conv.title or conversation_id}']"
        await self.repo.update_summary(conv, summary)
        await self.db.commit()
        return summary