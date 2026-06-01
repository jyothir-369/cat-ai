import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Any, Dict, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base


class MessageRoleEnum(str, PyEnum):
    """
    Message role tracking enum. Inherits from str to provide clear JSON serialization
    boundaries for API and worker data boundaries.
    """
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ToolStatusEnum(str, PyEnum):
    """
    Durable status enum tracking isolated sandboxed tool execution lifecycles.
    """
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Structural Tenant Isolation Layer - Replaced org_id with workspace_id
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("workspaces.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False, default="gpt-4o")
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # JSONB Metadata Dictionary Mapping with explicit Type Declarations
    metadata_: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, server_default="{}")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationship Orchestration Mechanics
    messages: Mapped[List["Message"]] = relationship(
        "Message", 
        back_populates="conversation", 
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("conversations.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    role: Mapped[MessageRoleEnum] = mapped_column(
        Enum(MessageRoleEnum, name="message_role_enum", native_enum=True),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    tokens_out: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    model_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship Back-Populations
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    tool_calls: Mapped[List["ToolCall"]] = relationship(
        "ToolCall", 
        back_populates="message", 
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("messages.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    output: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    status: Mapped[ToolStatusEnum] = mapped_column(
        Enum(ToolStatusEnum, name="tool_status_enum", native_enum=True),
        default=ToolStatusEnum.PENDING,
        server_default="pending",
        nullable=False
    )
    
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship Connections
    message: Mapped["Message"] = relationship("Message", back_populates="tool_calls")