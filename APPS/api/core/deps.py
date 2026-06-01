"""
Enterprise Multi-Tenant SaaS Dependency Injection Guard System Architecture.
Provides uniform authentication verification, tenant isolation boundaries, and RBAC enforcement.
"""

from __future__ import annotations
from typing import Annotated, Any, AsyncGenerator, Dict, List, Optional
import logging

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import InvalidTokenError, to_http_exception
from core.security import decode_token
from db.session import get_async_sessionmaker

logger = logging.getLogger("api.core.deps")

# Structural declarations matching system-wide domain models
ROLE_USER = "user"
ROLE_ADMIN = "admin"
ROLE_OWNER = "owner"
ROLE_SUPERADMIN = "superadmin"


# ── Database Transaction Dependency ──────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Explicit database session generator proxy dependency.
    Establishes clean transactional scopes with automatic rollback on handler failures.
    Optimized to safely unwrap session structures without generator forwarding bottlenecks.
    """
    session_factory = get_async_sessionmaker()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            logger.error("Request lifecycle database transaction breakdown. Rolling back: %s", str(exc))
            await session.rollback()
            raise
        finally:
            await session.close()

DBSession = Annotated[AsyncSession, Depends(get_db)]


# ── JWT Payload Extraction Dependency ────────────────────────────────────────

async def get_current_user_payload(
    authorization: Annotated[Optional[str], Header(description="Bearer authorization security token string.")] = None,
) -> Dict[str, Any]:
    """
    Validates the inbound HTTP Authorization Bearer token header structure.
    Decodes cryptographic token payload configurations with explicit error categorization.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "AUTHENTICATION_ERROR",
                    "message": "Missing, invalid, or corrupted Authorization security credentials header structure.",
                }
            },
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = decode_token(token)

        if payload.get("type") != "access":
            raise InvalidTokenError()

        return payload

    except JWTError:
        raise to_http_exception(InvalidTokenError())


# ── Authenticated User Resolution ───────────────────────────────────────────

async def get_current_user(
    payload: Dict[str, Any] = Depends(get_current_user_payload),
) -> Dict[str, Any]:
    """
    Returns full authenticated user payload configuration mappings.
    Maintains compatibility with active routing configurations.
    """
    if payload.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {
                    "code": "USER_DISABLED",
                    "message": "The requesting identity matching this user session credential profile has been suspended.",
                }
            }
        )
    return payload

CurrentUser = Annotated[Dict[str, Any], Depends(get_current_user)]


# ── Multi-Tenant Core Helpers & Isolation Guards ─────────────────────────────

def get_workspace_id(payload: Dict[str, Any] = Depends(get_current_user)) -> str:
    """
    Extracts the contextual tenant workspace boundary identifier reference 
    from the current token configuration claims.
    """
    workspace_id = payload.get("workspace_id")

    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "code": "MISSING_WORKSPACE",
                    "message": "Cross-tenant boundaries block processing context: No valid workspace reference claimed.",
                }
            },
        )

    return str(workspace_id)

WorkspaceID = Annotated[str, Depends(get_workspace_id)]


def get_current_workspace(workspace_id: str = Depends(get_workspace_id)) -> str:
    """
    Alternative domain model name resolution.
    Fetches isolation parameters to ensure reliable database multi-tenant scope filtering.
    """
    return workspace_id

CurrentWorkspace = Annotated[str, Depends(get_current_workspace)]


def get_current_org(workspace_id: str = Depends(get_workspace_id)) -> str:
    """
    Alias dependency resolving organization requirements to workspace scopes.
    Fixes ImportError risks within core API router configurations.
    """
    return workspace_id

CurrentOrg = Annotated[str, Depends(get_current_org)]


def get_user_id(payload: Dict[str, Any] = Depends(get_current_user)) -> str:
    """
    Safely extracts the unique system reference matching the subject user record tracking primary key identifier.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Subject claim record identifier ('sub') missing from token metadata mapping fields.",
                }
            },
        )
    return str(user_id)

UserID = Annotated[str, Depends(get_user_id)]


# ── Role-Based Access Control Architecture Engine ────────────────────────────

class RoleRequirementGuard:
    """
    Reusable and testable functional class factory wrapper.
    Evaluates multi-tier tenant administrative authority states.
    """
    def __init__(self, allowed_roles: List[str], error_message: Optional[str] = None) -> None:
        self.allowed_roles = allowed_roles
        self.error_message = error_message or "Insufficient structural role authority clearance to perform this domain operation step."

    async def __call__(self, payload: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        """
        Executes the permission evaluation logic asynchronously against user context payloads.
        Satisfies inspection criteria matching FastAPI dependency call signatures.
        """
        user_role = payload.get("role")
        
        # Superadmins always bypass local workspace role checks
        if user_role == ROLE_SUPERADMIN:
            return payload
            
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": self.error_message,
                        "required_clearance_levels": self.allowed_roles,
                        "current_identity_level": user_role
                    }
                },
            )
        return payload


def require_role(*roles: str) -> RoleRequirementGuard:
    """
    Functional dynamic role assertion interface fallback helper method.
    Returns a raw, callable RoleRequirementGuard instance to avoid double wrapping.
    """
    return RoleRequirementGuard(allowed_roles=list(roles))


# ── Fine-Grained Security Dependency Declarations ───────────────────────────

# Exported as raw callables instead of wrapping them in Depends().
# This lets downstream routers choose whether to consume them via Depends() or via modern Annotated type-hints.

require_admin = RoleRequirementGuard(
    allowed_roles=[ROLE_ADMIN, ROLE_OWNER, ROLE_SUPERADMIN],
    error_message="Access denied: This operation requires workspace administrative clearance metrics."
)

require_owner = RoleRequirementGuard(
    allowed_roles=[ROLE_OWNER, ROLE_SUPERADMIN],
    error_message="Access denied: This operation requires explicit organizational tenant owner authority states."
)

require_superadmin = RoleRequirementGuard(
    allowed_roles=[ROLE_SUPERADMIN],
    error_message="Access denied: Restricted system administration configuration panel. Operational context requires global platform superadmin authorization privileges."
)


# ── Modern Annotated Dependency Export Mappings ──────────────────────────────

# Provides clean, reusable aliases for alternative routing setups
SuperAdminRequired = Annotated[Dict[str, Any], Depends(require_superadmin)]
AdminRequired = Annotated[Dict[str, Any], Depends(require_admin)]
OwnerRequired = Annotated[Dict[str, Any], Depends(require_owner)]