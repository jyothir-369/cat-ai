"""
Centralized SQLAlchemy Model Registry Database package initializer.
Ensures topological ordering of imports to guarantee consistent table and 
foreign key registration inside SQLAlchemy's declarative MetaData instance.
"""

from __future__ import annotations

# 1. Initialize core infrastructure dependencies
from db.session import Base

# 2. Level 0: Primary Domain Identity Entities (Independent parent tables)
from db.models.user import (
    User,
    Organization,
    Membership,
    UserSession,
    APIKey,
)

# 3. Level 1: Core Functional Domains (Dependent on Identity Entities)
from db.models.integration import Integration

from db.models.workflow import (
    Workflow,
    WorkflowVersion,
    WorkflowRun,
    WorkflowStepRun,
    WebhookEvent,
)

# 4. Level 2: Supplemental SaaS Subsystems (Imported to ensure full Alembic tracking)
# Note: If your project structure includes these domain files, they must be registered here.
# Adjust the target class names below to match your exact declarations inside those files.
try:
    from db.models.knowledge import KnowledgeBase, Document, DocumentChunk
except ImportError:
    # Safe fallbacks if structural files are currently empty shells during drafting phases
    KnowledgeBase, Document, DocumentChunk = None, None, None

try:
    from db.models.billing import Subscription, Invoice, UsageLog
except ImportError:
    Subscription, Invoice, UsageLog = None, None, None

try:
    from db.models.audit import AuditLog, Notification
except ImportError:
    AuditLog, Notification = None, None, None


# 5. Build explicit programmatic array filtering out unresolved proxy targets
_all_exports = [
    # Base Engine Matrix
    "Base",
    # Identity Models
    "User",
    "Organization",
    "Membership",
    "UserSession",
    "APIKey",
    # Integrations Models
    "Integration",
    # Workflow Pipeline Models
    "Workflow",
    "WorkflowVersion",
    "WorkflowRun",
    "WorkflowStepRun",
    "WebhookEvent",
    # Auxiliary Platform Domain Models
    "KnowledgeBase",
    "Document",
    "DocumentChunk",
    "Subscription",
    "Invoice",
    "UsageLog",
    "AuditLog",
    "Notification",
]

# Expose only active, successfully bound classes through the namespace gateway
__all__ = [name for name in _all_exports if globals().get(name) is not None]