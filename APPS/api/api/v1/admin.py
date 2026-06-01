"""
Platform-Wide Administrative Operations, Tenant Management, & System Audit Router.
Provides isolated analytical operations dashboards restricted exclusively to Superadmin scopes.
"""

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_db, require_superadmin
from db.models.user import User, Organization, Membership
from db.models.conversation import Conversation
from db.models.billing import UsageLog
from db.models.audit import AuditLog

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Pydantic Data Validation Schemas (Pydantic V2 Compliant) ─────────────────

class UserAdminOut(BaseModel):
    id: str = Field(..., description="Unique platform user tracking identifier.")
    email: str = Field(..., description="Primary electronic mail account destination.")
    name: str = Field(..., description="User profile display moniker name.")
    is_active: bool = Field(..., description="Active session operational account confirmation status.")
    is_superadmin: bool = Field(..., description="Global system override administrator status flag.")
    created_at: datetime = Field(..., description="Account metadata instantiation timestamp.")
    last_login: Optional[datetime] = Field(None, description="System metadata access tracking tracking metric.")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class OrgAdminOut(BaseModel):
    id: str = Field(..., description="Unique tenant workspace tracking organization identifier.")
    name: str = Field(..., description="Workspace organization legal display title.")
    slug: str = Field(..., description="URL routing clean path parameter slug mapping identifier.")
    plan: str = Field(..., description="Active subscription billing target product tier designation.")
    member_count: int = Field(..., description="Total active identities attached to this multi-tenant organization context.")
    created_at: datetime = Field(..., description="Tenant environment initialization timestamp.")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class PlatformMetrics(BaseModel):
    total_users: int = Field(..., description="Cumulative index metric tracking all system profiles.")
    active_users_30d: int = Field(..., description="Rolling monthly verification target window tracking user velocity.")
    total_orgs: int = Field(..., description="Total registered corporate multi-tenant isolation contexts.")
    total_conversations: int = Field(..., description="Total aggregate runtime conversation instances generated across all nodes.")
    total_requests_30d: int = Field(..., description="Total transactional execution counts across a rolling 30-day index window.")
    total_tokens_30d: int = Field(..., description="Cumulative consumption volume tracking all input/output vectors.")
    total_cost_usd_30d: float = Field(..., description="Financial clearing summary metric tracking model operational expenses.")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class AuditLogOut(BaseModel):
    id: str = Field(..., description="Unique ledger transaction entry identifier.")
    org_id: Optional[str] = Field(None, description="Target isolation boundary context reference identifier.")
    user_id: Optional[str] = Field(None, description="Initiating security actor tracking profile parameter identifier.")
    action: str = Field(..., description="Standardized operational tracking key event signature string.")
    resource_type: Optional[str] = Field(None, description="Target system data domain namespace classification string.")
    resource_id: Optional[str] = Field(None, description="Target component primary system key reference parameter identifier.")
    ip_address: Optional[str] = Field(None, description="Network context origin structural route tracking value.")
    created_at: datetime = Field(..., description="Ledger transaction write execution timestamp.")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class UserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Target boolean state tracking flag setting account clearance accessibility metrics.")

    model_config = ConfigDict(protected_namespaces=())


# ── Operational Administrative Endpoints ─────────────────────────────────────

@router.get("/metrics", response_model=PlatformMetrics, status_code=status.HTTP_200_OK)
async def get_platform_metrics(
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> PlatformMetrics:
    """
    Platform-wide aggregate metrics dashboard for operations monitoring.
    Restricted exclusively to system administrators.
    """
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Execute concurrent data aggregation lookups across tables
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    active_users_30d = (
        await db.execute(
            select(func.count(User.id)).where(User.last_login >= thirty_days_ago)
        )
    ).scalar() or 0

    total_orgs = (await db.execute(select(func.count(Organization.id)))).scalar() or 0

    total_conversations = (
        await db.execute(select(func.count(Conversation.id)))
    ).scalar() or 0

    usage_result = await db.execute(
        select(
            func.count(UsageLog.id).label("requests"),
            func.coalesce(func.sum(UsageLog.tokens_in + UsageLog.tokens_out), 0).label("tokens"),
            func.coalesce(func.sum(UsageLog.cost_usd), 0.0).label("cost"),
        ).where(UsageLog.created_at >= thirty_days_ago)
    )
    usage_row = usage_result.one()

    return PlatformMetrics(
        total_users=total_users,
        active_users_30d=active_users_30d,
        total_orgs=total_orgs,
        total_conversations=total_conversations,
        total_requests_30d=usage_row.requests or 0,
        total_tokens_30d=usage_row.tokens or 0,
        total_cost_usd_30d=round(float(usage_row.cost or 0), 4),
    )


@router.get("/users", response_model=List[UserAdminOut], status_code=status.HTTP_200_OK)
async def list_all_users(
    limit: int = Query(default=50, le=200, description="Pagination page configuration limit metric constraint."),
    offset: int = Query(default=0, ge=0, description="Pagination tracking skip offset element counter reference."),
    search: Optional[str] = Query(default=None, description="Fuzzy textual query parameter checking names or email match records."),
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> List[UserAdminOut]:
    """
    Lists platform users with full metadata instrumentation.
    Provides structured query filters for email and name matching.
    """
    q = select(User)
    if search:
        q = q.where(
            User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%")
        )
    q = q.order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    users = result.scalars().all()
    return [_map_user_to_admin_out(u) for u in users]


@router.get("/users/{user_id}", response_model=UserAdminOut, status_code=status.HTTP_200_OK)
async def get_user(
    user_id: str,
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    """
    Fetches comprehensive internal configuration diagnostics for a specific user profile.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User identity record mapping target '{user_id}' not found.")
    return _map_user_to_admin_out(user)


@router.patch("/users/{user_id}/status", response_model=UserAdminOut, status_code=status.HTTP_200_OK)
async def update_user_status(
    user_id: str,
    body: UserStatusUpdate,
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    """
    Updates a user's access status to instantly activate or lock account profiles.
    Prevents self-locking administrative actions.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User identity record mapping target '{user_id}' not found.")
    
    # Self-locking validation check using claims criteria parameters
    if str(user.id) == str(admin_user.get("sub")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Operation denied: Operational safety constraints block changing your own administrative accessibility status."
        )

    user.is_active = body.is_active

    # Write audit log tracking to database session
    db.add(AuditLog(
        org_id=None,
        user_id=str(admin_user.get("sub")),
        action="admin.user.status_change",
        resource_type="user",
        resource_id=user_id,
        metadata_={"is_active": body.is_active},
    ))

    # Commit transactions cleanly to ensure changes persist in SQLAlchemy 2.x
    await db.commit()
    await db.refresh(user)

    return _map_user_to_admin_out(user)


@router.get("/orgs", response_model=List[OrgAdminOut], status_code=status.HTTP_200_OK)
async def list_all_orgs(
    limit: int = Query(default=50, le=200, description="Pagination sizing metric constraint."),
    offset: int = Query(default=0, ge=0, description="Pagination index metric marker tracking skipping fields."),
    plan: Optional[str] = Query(default=None, description="Optional target pricing plan filter parameter selection."),
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> List[OrgAdminOut]:
    """
    Lists system-wide tenant organization workspaces with active sub-tier metadata logs.
    """
    q = select(Organization)
    if plan:
        q = q.where(Organization.plan == plan)
        
    q = q.order_by(Organization.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    orgs = result.scalars().all()

    member_counts: Dict[str, int] = {}
    if orgs:
        org_ids = [o.id for o in orgs]
        counts_result = await db.execute(
            select(Membership.org_id, func.count(Membership.id).label("count"))
            .where(Membership.org_id.in_(org_ids))
            .group_by(Membership.org_id)
        )
        member_counts = {row.org_id: row.count for row in counts_result.all()}

    return [
        OrgAdminOut(
            id=str(o.id),
            name=str(o.name),
            slug=str(o.slug),
            plan=o.plan.value if hasattr(o.plan, "value") else str(o.plan),
            member_count=member_counts.get(o.id, 0),
            created_at=o.created_at,
        )
        for o in orgs
    ]


@router.get("/audit-logs", response_model=List[AuditLogOut], status_code=status.HTTP_200_OK)
async def get_audit_logs(
    limit: int = Query(default=50, le=200, description="Pagination threshold metric parameter standard constraint sizing log page counts."),
    offset: int = Query(default=0, ge=0, description="Pagination pointer trace index."),
    action: Optional[str] = Query(default=None, description="Filter log results matching designated metric action labels."),
    org_id: Optional[str] = Query(default=None, description="Isolate logs targeting explicit multi-tenant parameters."),
    admin_user: Dict[str, Any] = require_superadmin,
    db: AsyncSession = Depends(get_db),
) -> List[AuditLogOut]:
    """
    Fetches compliance ledger events recorded across all tenant nodes.
    """
    q = select(AuditLog)
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action}%"))
    if org_id:
        q = q.where(AuditLog.org_id == org_id)
    q = q.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    logs = result.scalars().all()
    
    return [
        AuditLogOut(
            id=str(log.id),
            org_id=str(log.org_id) if log.org_id else None,
            user_id=str(log.user_id) if log.user_id else None,
            action=str(log.action),
            resource_type=str(log.resource_type) if log.resource_type else None,
            resource_id=str(log.resource_id) if log.resource_id else None,
            ip_address=str(log.ip_address) if log.ip_address else None,
            created_at=log.created_at,
        )
        for log in logs
    ]


# ── Operational Health Probe (Public Scope Accessibility) ────────────────────

@router.get("/health", include_in_schema=True, tags=["health"])
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Liveness probe endpoint.
    Verifies database connectivity before declaring health operational clearance.
    """
    try:
        await db.execute(select(func.now()))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Internal Conversion Helper Mappings ──────────────────────────────────────

def _map_user_to_admin_out(u: User) -> UserAdminOut:
    """
    Maps an internal SQLAlchemy ORM User instance to a validated UserAdminOut schema.
    Ensures safe timezone processing.
    """
    return UserAdminOut(
        id=str(u.id),
        email=str(u.email),
        name=str(u.name or ""),
        is_active=bool(u.is_active),
        is_superadmin=bool(u.is_superadmin),
        created_at=u.created_at if u.created_at.tzinfo else u.created_at.replace(tzinfo=timezone.utc),
        last_login=u.last_login if (not u.last_login or u.last_login.tzinfo) else u.last_login.replace(tzinfo=timezone.utc),
    )