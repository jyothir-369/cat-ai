"""
Centralized Enterprise Platform Exception Architecture Registry.
Provides uniform serialization structures compatible with FastAPI middleware handlers.
"""

from __future__ import annotations
from typing import Any, Dict, Optional, List
from fastapi import HTTPException, status

__all__ = [
    "AppError",
    "AuthError",
    "AuthenticationError",
    "AuthorizationError",
    "InvalidTokenError",
    "PermissionDeniedError",
    "WorkspaceIsolationError",
    "NotFoundError",
    "ConflictError",
    "ValidationError",
    "RateLimitError",
    "BillingError",
    "PlanLimitError",
    "PlanLimitExceededError",
    "QuotaExceededError",
    "UsageLimitError",
    "ProviderError",
    "AllProvidersFailedError",
    "to_http_exception",
]


# ── Base System Error Exception ──────────────────────────────────────────────

class AppError(Exception):
    """
    Base domain architecture error. All downstream platform exceptions must 
    inherit from this class to guarantee consistent middleware serialization.
    """
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "INTERNAL_ERROR"

    def __init__(
        self, 
        message: str, 
        code: Optional[str] = None, 
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> Dict[str, Any]:
        """Provides standardized serialization output for app error handlers."""
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }


# ── Restored Foundational Security Base Class ────────────────────────────────

class AuthError(AppError):
    """
    Unified base security exception layer. Restores explicit structural compatibility 
    with legacy routers and auth services without compromising fine-grained RBAC design.
    """
    status_code: int = status.HTTP_401_UNAUTHORIZED
    code: str = "AUTH_ERROR"

    def __init__(
        self, 
        message: str = "Authentication or authorization validation failed.", 
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(
            message=message, 
            code=code or self.code, 
            status_code=status_code or self.status_code,
            details=details
        )


# ── Core Security & Identity Lifecycle Exceptions ────────────────────────────

class AuthenticationError(AuthError):
    """Raised when request identity credentials or tokens fail confirmation validation."""
    status_code: int = status.HTTP_401_UNAUTHORIZED
    code: str = "AUTHENTICATION_ERROR"

    def __init__(self, message: str = "Authentication validation failed.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


class AuthorizationError(AuthError):
    """Raised when an identified user attempts an operation blocked by RBAC controls."""
    status_code: int = status.HTTP_403_FORBIDDEN
    code: str = "AUTHORIZATION_ERROR"

    def __init__(self, message: str = "Action barred by security profile controls.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


class InvalidTokenError(AuthenticationError):
    """Explicitly raised when authorization JWT tokens are expired, corrupted, or altered."""
    code: str = "INVALID_TOKEN"

    def __init__(self, message: str = "The provided security bearer token is invalid or expired.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, details=details)


class PermissionDeniedError(AuthorizationError):
    """Raised when user permissions are valid but lack resource ownership clearance."""
    code: str = "PERMISSION_DENIED"

    def __init__(self, message: str = "Resource access rejected: insufficient transactional authority.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, details=details)


# ── Multi-Tenant Boundary & Domain Isolation Exceptions ──────────────────────

class WorkspaceIsolationError(AuthorizationError):
    """Raised when cross-tenant data requests breach isolation boundaries."""
    code: str = "WORKSPACE_ISOLATION_BREACH"

    def __init__(self, message: str = "Cross-workspace tenant data isolation access denied.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, details=details)


class NotFoundError(AppError):
    """
    Raised when a specific database entity cannot be found within the tenant context.
    Accepts polymorphic keyword arguments to support versatile service call styles.
    """
    status_code: int = status.HTTP_404_NOT_FOUND
    code: str = "NOT_FOUND"

    def __init__(self, entity_name: str, entity_id: Optional[Any] = None, *args: Any, **kwargs: Any) -> None:
        self.entity_name = entity_name or kwargs.get("resource", "Resource")
        self.entity_id = entity_id or kwargs.get("id", None)
        
        if self.entity_id:
            msg = f"{self.entity_name} '{self.entity_id}' not found."
        else:
            msg = f"{self.entity_name} not found."
            
        details = kwargs.get("details", {})
        if self.entity_id and "entity_id" not in details:
            details = {**details, "entity_name": self.entity_name, "entity_id": str(self.entity_id)}
            
        super().__init__(message=msg, code=self.code, status_code=self.status_code, details=details)


class ConflictError(AppError):
    """Raised when an operations payload breaks uniqueness, sequencing, or state rules."""
    status_code: int = status.HTTP_409_CONFLICT
    code: str = "CONFLICT"

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


class ValidationError(AppError):
    """Raised when parameters fail structural validation invariants."""
    status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY
    code: str = "VALIDATION_ERROR"

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


# ── API Gateway Resilience & Rate Limiting Exceptions ────────────────────────

class RateLimitError(AppError):
    """Raised when an application tenant or IP address exceeds traffic velocity limits."""
    status_code: int = status.HTTP_429_TOO_MANY_REQUESTS
    code: str = "RATE_LIMIT_EXCEEDED"

    def __init__(self, message: str = "Rate limit exceeded. Please lower transaction velocity metrics.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


# ── Multi-Tenant SaaS Subscriptions & Account Bounding Exceptions ────────────

class BillingError(AppError):
    """Raised when operation requests fail due to outstanding balances or billing issues."""
    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "BILLING_ERROR"

    def __init__(
        self, 
        message: str, 
        code: Optional[str] = None, 
        status_code: Optional[int] = None, 
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(
            message=message, 
            code=code or self.code, 
            status_code=status_code or self.status_code, 
            details=details
        )


class PlanLimitError(BillingError):
    """
    CRITICAL INTERFACE RESOLUTION: Raised when a tenant breaches usage bounds,
    tier threshold constraints, or token ceilings.
    """
    status_code: int = status.HTTP_403_FORBIDDEN
    code: str = "PLAN_LIMIT_EXCEEDED"

    def __init__(
        self, 
        message: str = "SaaS profile account tier limit ceiling reached.", 
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        super().__init__(
            message=message, 
            code=code or self.code, 
            status_code=status_code or self.status_code, 
            details=details
        )


class PlanLimitExceededError(PlanLimitError):
    """
    Provides backward compatibility for existing domain configurations that reference
    the explicit structural error class name. Maps to HTTP 402 Payment Required.
    """
    status_code: int = status.HTTP_402_PAYMENT_REQUIRED
    code: str = "QUOTA_EXCEEDED"

    def __init__(self, limit_type: str, details: Optional[Dict[str, Any]] = None) -> None:
        merged_details = {"violation_parameter": limit_type, **(details or {})}
        super().__init__(
            message=f"SaaS profile usage target exceeded tier quota for: '{limit_type}'.",
            code=self.code,
            status_code=self.status_code,
            details=merged_details
        )


class QuotaExceededError(PlanLimitExceededError):
    """Explicitly mirrors PlanLimitExceededError for codebases calling QuotaExceededError directly."""
    pass


class UsageLimitError(PlanLimitExceededError):
    """Explicitly mirrors PlanLimitExceededError for codebases calling UsageLimitError directly."""
    pass


# ── Distributed AI Infrastructure Orchestration Exceptions ───────────────────

class ProviderError(AppError):
    """Raised when an external Large Language Model engine returns an execution error."""
    status_code: int = status.HTTP_502_BAD_GATEWAY
    code: str = "AI_PROVIDER_ERROR"

    def __init__(self, message: str, provider: str = "unknown", retryable: bool = False) -> None:
        self.provider = provider
        self.retryable = retryable
        super().__init__(
            message=f"Upstream provider link failure on '{provider}': {message}",
            code=self.code,
            status_code=self.status_code,
            details={"provider": provider, "retryable": retryable}
        )


class AllProvidersFailedError(AppError):
    """Raised when every fallback provider node fails to clear execution loops."""
    status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE
    code: str = "ALL_PROVIDERS_UNAVAILABLE"

    def __init__(self, message: str = "All configured upstream model proxy clusters failed availability checks.", details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message=message, code=self.code, status_code=self.status_code, details=details)


# ── FastAPI Middleware / Controller Serialization Mapper ──────────────────────

def to_http_exception(err: AppError) -> HTTPException:
    """
    Transforms internal domain exceptions into native FastAPI HTTPException blocks.
    Ensures clear structure formatting across JSON output endpoints.
    """
    return HTTPException(
        status_code=err.status_code,
        detail={
            "success": False,
            "error": {
                "code": err.code,
                "message": err.message,
                "details": err.details
            }
        }
    )