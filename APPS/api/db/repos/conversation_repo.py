"""
Conversation repository — all raw ORM queries for conversations and messages.
No business logic here — just data access.
"""
from __future__ import annotations
from typing import Optional, List, Tuple, Any
from uuid import UUID

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.conversation import Conversation, Message


class ConversationRepo:
    def __init__(self, db: AsyncSession):
        """
        Initializes the repository instance using a shared database transaction session context.
        Matches the instantiation pattern expected by ConversationService.
        """
        self.db = db

    async def get_by_id(self, conversation_id: UUID, workspace_id: UUID) -> Optional[Conversation]:
        """
        Retrieves a singular conversation domain entity scoped by its workspace tenant context.
        """
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_workspace(
        self,
        workspace_id: UUID,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Conversation], int]:
        """
        Fetches a paginated subset of conversation records along with a total scalar count 
        for a given user and workspace.
        """
        # Base filter condition
        base_conditions = [
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == user_id
        ]

        # Query 1: Fetch total scalar match record count
        count_query = select(func.count()).where(*base_conditions)
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar_one()

        # Query 2: Fetch the paginated records subset
        records_query = (
            select(Conversation)
            .where(*base_conditions)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        records_result = await self.db.execute(records_query)
        conversations = list(records_result.scalars().all())

        return conversations, total_count

    async def create(
        self,
        workspace_id: UUID,
        user_id: UUID,
        title: str,
        model_id: str,
        system_prompt: Optional[str] = None,
    ) -> Conversation:
        """
        Persists a fresh conversation entity thread block into the database infrastructure.
        """
        conversation = Conversation(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title,
            model_id=model_id,
            system_prompt=system_prompt,
        )
        self.db.add(conversation)
        await self.db.flush()  # Populates object ID properties using database sequence state
        return conversation

    async def delete(self, conversation: Conversation) -> None:
        """
        Removes an active conversation entity instance from the persistent session pool.
        """
        await self.db.delete(conversation)
        await self.db.flush()

    async def get_messages_paginated(
        self,
        conversation_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Message], int]:
        """
        Retrieves a paginated list of trace tracking messages along with a total scalar count.
        """
        condition = Message.conversation_id == conversation_id

        # Query 1: Compute total message counter
        count_query = select(func.count()).where(condition)
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar_one()

        # Query 2: Extract ordered chunk records
        messages_query = (
            select(Message)
            .where(condition)
            .order_by(Message.created_at.asc())  # Ascending order preserves sequential trace continuity
            .limit(limit)
            .offset(offset)
        )
        messages_result = await self.db.execute(messages_query)
        messages = list(messages_result.scalars().all())

        return messages, total_count

    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        model_id: Optional[str] = None,
        tokens_in: int = 0,
        tokens_out: int = 0,
        latency_ms: int = 0,
    ) -> Message:
        """
        Appends an analytical interaction message trace log to the backend log index.
        """
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_id=model_id,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def update_summary(self, conversation: Conversation, summary: str) -> Conversation:
        """
        Updates the structural short summary text context buffer for long-tail window optimizations.
        """
        conversation.summary = summary
        self.db.add(conversation)
        await self.db.flush()
        return conversation