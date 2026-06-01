import logging
import time
from typing import Any, Dict, List, Tuple, Optional
import asyncio

from fastapi import status
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from core.config import settings

logger = logging.getLogger("api.middleware.rate_limit")


class RateLimitMiddleware:
    """
    Production-grade, asynchronous, multi-tenant aware rate limiting ASGI middleware.
    
    Features:
      - Validates and defaults all limits dynamically from modernized Pydantic settings.
      - Uses a sliding window algorithm.
      - Seamlessly handles multi-tenant plans (free, pro, team, enterprise).
      - Multi-tiered key fallback (Tenant+User -> Individual User -> Client IP Address).
      - Gracefully falls back to local memory if the Redis broker is unavailable.
    """

    def __init__(self, app: ASGIApp, redis_url: Optional[str] = None) -> None:
        self.app = app
        self.redis_url = redis_url or getattr(settings, "redis_url", None)
        self.redis_client: Optional[Any] = None
        self.use_redis = False

        # ── 1. Defensive Configuration Compilation & Default Fallbacks ──────
        self.limit_free = int(getattr(settings, "rate_limit_free", 20))
        self.limit_pro = int(getattr(settings, "rate_limit_pro", 100))
        self.limit_team = int(getattr(settings, "rate_limit_team", 500))
        self.limit_enterprise = 2000
        self.limit_anonymous = 10

        self.window_seconds = 60
        self.paths_prefix = "/api/v1/"

        # Local in-memory fallback cache engine structures
        self._local_windows: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

        # ── 2. Run Comprehensive Startup Boundary Validations ──────────────────
        self._validate_startup_bounds()
        
        # ── 3. Initialize Shared Redis Client Context Connection ─────────────
        self._initialize_redis_engine()

    def _validate_startup_bounds(self) -> None:
        """Verifies configuration values to ensure there are no zero or negative limit conditions on boot."""
        if self.limit_free <= 0:
            raise RuntimeError(f"Config Validation Failure: rate_limit_free must be greater than 0. Value: {self.limit_free}")
        if self.limit_pro <= 0:
            raise RuntimeError(f"Config Validation Failure: rate_limit_pro must be greater than 0. Value: {self.limit_pro}")
        if self.limit_team <= 0:
            raise RuntimeError(f"Config Validation Failure: rate_limit_team must be greater than 0. Value: {self.limit_team}")
        
        logger.info(
            "Rate limiting limits validated successfully. Free: %d/min, Pro: %d/min, Team: %d/min",
            self.limit_free, self.limit_pro, self.limit_team
        )

    def _initialize_redis_engine(self) -> None:
        """Attempts to instantiate a redis connection pool safely."""
        if not self.redis_url:
            logger.warning("REDIS_URL parameter is absent. Falling back to local in-memory storage driver.")
            return

        try:
            import redis.asyncio as aioredis
            # Build connection optimization pools defensively
            self.redis_client = aioredis.from_url(
                str(self.redis_url),
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                retry_on_timeout=True
            )
            self.use_redis = True
            logger.info("Distributed Rate Limiting Redis engine initialized successfully.")
        except ImportError:
            logger.error("The package 'redis' is missing. Please run 'pip install redis'. Falling back to local tracking storage.")
        except Exception as exc:
            logger.error("Failed to connect to the Redis broker node. Context: %s", str(exc), exc_info=True)

    def _get_allowed_limit(self, plan: Optional[str]) -> int:
        """Maps tier parameters to explicit numerical limits safely."""
        if not plan:
            return self.limit_free
        
        plan_normalized = plan.strip().lower()
        if plan_normalized == "pro":
            return self.limit_pro
        elif plan_normalized == "team":
            return self.limit_team
        elif plan_normalized == "enterprise":
            return self.limit_enterprise
        elif plan_normalized == "anonymous":
            return self.limit_anonymous
        return self.limit_free

    # ── Sliding Window Evaluation Implementations ──────────────────────────

    async def _check_redis_window(self, key: str, limit: int) -> Tuple[bool, int]:
        """Evaluates transaction boundaries using an atomic pipeline over an asynchronous Redis cluster."""
        if not self.redis_client:
            return True, 0
            
        now = time.time()
        clear_before = now - self.window_seconds
        
        try:
            async with self.redis_client.pipeline(transaction=True) as pipe:
                # Evict stale entries outside the current sliding window boundary
                await pipe.zremrangebyscore(key, 0, clear_before)
                # Count current valid timestamps inside the active window
                await pipe.zcard(key)
                # Append the new execution timestamp
                await pipe.zadd(key, {str(now): now})
                # Auto-expire the database key structure cleanly to conserve memory
                await pipe.expire(key, self.window_seconds + 5)
                
                # Execute pipeline instructions atomically
                results = await pipe.execute()
                
            current_count = int(results[1])
            if current_count >= limit:
                return False, current_count
            return True, current_count + 1
            
        except Exception as exc:
            logger.error("Redis tracking engine failure: %s. Falling back to internal memory lookup.", str(exc))
            return await self._check_local_window(key, limit)

    async def _check_local_window(self, key: str, limit: int) -> Tuple[bool, int]:
        """Fallback engine evaluating in-process metrics using a shared thread-safe asynchronous lock loop."""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            timestamps = self._local_windows.get(key, [])
            # Evict stale list elements
            timestamps = [t for t in timestamps if t > window_start]
            
            if len(timestamps) >= limit:
                self._local_windows[key] = timestamps
                return False, len(timestamps)
                
            timestamps.append(now)
            self._local_windows[key] = timestamps
            return True, len(timestamps)

    # ── Core ASGI Pipeline Invocation Hook ───────────────────────────────────

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Intercepts downstream execution flows using standard ASGI protocol scopes.
        """
        # 1. Passthrough checks for non-HTTP connection metrics or asset routes
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if not path.startswith(self.paths_prefix):
            await self.app(scope, receive, send)
            return

        # 2. Extract multi-tenant metadata defensively from header definitions
        headers = dict(scope.get("headers", []))
        
        # Look for headers containing workspace identification contexts passed by proxy or API layers
        workspace_id = headers.get(b"x-workspace-id", b"unknown").decode("utf-8")
        user_id = headers.get(b"x-user-id", b"").decode("utf-8")
        plan = headers.get(b"x-subscription-plan", b"").decode("utf-8")

        # 3. Handle unauthenticated anonymous clients safely
        if not user_id:
            # Fallback to the connecting client's network IP if no identification header exists
            client_host = scope.get("client")
            ip_address = client_host[0] if client_host else "anonymous_node"
            key = f"rl:anon:{ip_address}"
            limit = self._get_allowed_limit("anonymous")
        else:
            # Multi-tenant scoping configuration key pattern
            key = f"rl:{workspace_id or 'default'}:{user_id}"
            limit = self._get_allowed_limit(plan or "free")

        # 4. Perform sliding window rate limit valuation check
        if self.use_redis:
            allowed, count = await self.check_redis_window_fallback(key, limit)
        else:
            allowed, count = await self._check_local_window(key, limit)

        # 5. Intercept and block non-compliant requests with an explicit HTTP 429 response
        if not allowed:
            logger.warning("Rate limit barrier reached on key: %s | Blocked limit quota: %d/min", key, limit)
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(self.window_seconds),
                },
                content={
                    "error": "RATE_LIMITED",
                    "message": f"Rate limit exceeded. Maximum quota allowed is {limit} requests per minute. Upgrade your plan or retry later.",
                },
            )
            await response(scope, receive, send)
            return

        # 6. Inject updated rate limit headers into the response payload automatically
        async def send_wrapper(message: Dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                headers_list = list(message.get("headers", []))
                
                # Append tracking state headers to downstream packets
                remaining_quota = max(0, limit - count)
                headers_list.append((b"x-ratelimit-limit", str(limit).encode("utf-8")))
                headers_list.append((b"x-ratelimit-remaining", str(remaining_quota).encode("utf-8")))
                
                message["headers"] = headers_list
            await send(message)

        # Pass context execution to the next downstream component layer
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as error:
            logger.error("Unhandled runtime exception encountered within middleware stack: %s", str(error), exc_info=True)
            raise

    async def check_redis_window_fallback(self, key: str, limit: int) -> Tuple[bool, int]:
        """Helper method that routes requests to the local cache if Redis throws an exception."""
        try:
            return await self._check_redis_window(key, limit)
        except Exception:
            return await self._check_local_window(key, limit)