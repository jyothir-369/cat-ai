from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List, Optional, Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base

if TYPE_CHECKING:
    from db.models.user import User, Organization


# ── Enums ─────────────────────────────────────────────────────────────

class WorkflowRunStatusEnum(str, PyEnum):
    """
    Durable execution tracking lifecycle states for the DAG Engine.
    Inherits from (str, PyEnum) to guarantee seamless Pydantic V2 and FastAPI 
    serialization passes without explicit raw value extraction handlers.
    """
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"


class StepTypeEnum(str, PyEnum):
    """Supported step processing types within the Workflow Engine."""
    LLM = "llm"
    CONDITION = "condition"
    API_CALL = "api_call"
    RETRIEVAL = "retrieval"
    APPROVAL = "approval"
    TRANSFORM = "transform"
    LOOP = "loop"


# ── Models ─────────────────────────────────────────────────────────────

class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    versions: Mapped[List["WorkflowVersion"]] = relationship("WorkflowVersion", back_populates="workflow", cascade="all, delete-orphan")
    runs: Mapped[List["WorkflowRun"]] = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowVersion(Base):
    __tablename__ = "workflow_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    version_num: Mapped[int] = mapped_column(nullable=False)
    dag_definition: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="versions")
    runs: Mapped[List["WorkflowRun"]] = relationship("WorkflowRun", back_populates="workflow_version", cascade="all, delete-orphan")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Fixed: Production-grade Enum configuration with explicit native naming bounds to safeguard PostgreSQL/Alembic states
    status: Mapped[WorkflowRunStatusEnum] = mapped_column(
        Enum(WorkflowRunStatusEnum, name="workflow_run_status_enum", native_enum=True),
        default=WorkflowRunStatusEnum.PENDING,
        server_default="PENDING",
        nullable=False,
        index=True
    )
    
    input_payload: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    output_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
    workflow_version: Mapped["WorkflowVersion"] = relationship("WorkflowVersion", back_populates="runs")
    step_runs: Mapped[List["WorkflowStepRun"]] = relationship("WorkflowStepRun", back_populates="workflow_run", cascade="all, delete-orphan")


class WorkflowStepRun(Base):
    __tablename__ = "workflow_step_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    step_type: Mapped[StepTypeEnum] = mapped_column(
        Enum(StepTypeEnum, name="step_type_enum", native_enum=True),
        nullable=False
    )
    
    status: Mapped[WorkflowRunStatusEnum] = mapped_column(
        Enum(WorkflowRunStatusEnum, name="workflow_run_status_enum", inherit_schema=True, native_enum=True),
        default=WorkflowRunStatusEnum.PENDING,
        server_default="PENDING",
        nullable=False
    )
    
    input_data: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    output_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workflow_run: Mapped["WorkflowRun"] = relationship("WorkflowRun", back_populates="step_runs")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)