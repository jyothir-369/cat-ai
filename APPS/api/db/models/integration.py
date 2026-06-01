from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.session import Base

if TYPE_CHECKING:
    from db.models.user import User, Organization


class IntegrationProviderEnum(str, PyEnum):
    """Supported third-party identity and SaaS service providers."""
    SLACK = "slack"
    GMAIL = "gmail"
    NOTION = "notion"
    GOOGLE_SHEETS = "google_sheets"


class IntegrationStatusEnum(str, PyEnum):
    """Tracking states for integrated API connections."""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class Integration(Base):
    """
    Production database table handling third-party tenant credentials.
    Implements safe structural cascades, precise indexing strategies, 
    and a compatibility polyfill for workspace mapping layers.
    """
    __tablename__ = "integrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique system identifier for this integration record."
    )
    
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Tenant organization boundary for isolation."
    )
    
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The platform user who authenticated the OAuth flow."
    )
    
    provider: Mapped[IntegrationProviderEnum] = mapped_column(
        Enum(IntegrationProviderEnum, name="integration_provider_enum", native_enum=True),
        nullable=False,
        index=True,
        comment="The targeted third-party service provider name key."
    )
    
    encrypted_credentials: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="AES-256-GCM authenticated cipher block holding tokens securely."
    )
    
    scopes: Mapped[List[str]] = mapped_column(
        JSONB,
        server_default="[]",
        nullable=False,
        comment="Granted API permissions requested during authorization."
    )
    
    status: Mapped[IntegrationStatusEnum] = mapped_column(
        Enum(IntegrationStatusEnum, name="integration_status_enum", native_enum=True),
        default=IntegrationStatusEnum.ACTIVE,
        server_default="ACTIVE",
        nullable=False,
        index=True,
        comment="Current execution state tracking bound of this integration connection pathway."
    )
    
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Calculated timestamp marking token life end."
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # ── Polyfill Interoperability Getters/Setters ─────────────────────────
    @property
    def workspace_id(self) -> uuid.UUID:
        """Alias property to map cleanly against workspace-dependent business logic layers."""
        return self.org_id

    @workspace_id.setter
    def workspace_id(self, value: uuid.UUID) -> None:
        self.org_id = value

    # ── ORM Relationships ───────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="integrations",
        lazy="raise"  # Prevent accidental N+1 queries during bulk fetching
    )
    
    user: Mapped["User"] = relationship(
        "User",
        lazy="raise"
    )