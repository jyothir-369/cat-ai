"""
Production-Grade Billing Service — Stripe integration, plan enforcement, usage metering.
Removes synchronous event loop blocking and enforces scalable database bounding-box index scans.
"""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone, time
from typing import Optional, Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from core.config import settings
from core.exceptions import AppError, NotFoundError, BillingError, PlanLimitExceededError
from db.models.user import Organization, PlanEnum
from db.models.billing import Subscription, Invoice, UsageLog

logger = logging.getLogger("api.services.billing")

try:
    import stripe
    _stripe_key = getattr(settings, "stripe_secret_key", None)
    if _stripe_key:
        stripe.api_key = _stripe_key
        _STRIPE_AVAILABLE = True
    else:
        _STRIPE_AVAILABLE = False
except ImportError:
    stripe = None  # type: ignore
    _STRIPE_AVAILABLE = False


PLAN_LIMITS: Dict[PlanEnum, Dict[str, Any]] = {
    PlanEnum.free: {
        "messages_per_day": 50,
        "storage_bytes": 10 * 1024 * 1024,
        "workspaces": 1,
        "models": ["gpt-4o-mini", "gpt-3.5-turbo", "llama-3.1-70b-versatile"],
    },
    PlanEnum.pro: {
        "messages_per_day": -1,
        "storage_bytes": 5 * 1024 * 1024 * 1024,
        "workspaces": 1,
        "models": None,  # Unlimited model options allowed
    },
    PlanEnum.team: {
        "messages_per_day": -1,
        "storage_bytes": 50 * 1024 * 1024 * 1024,
        "workspaces": 5,
        "models": None,
    },
    PlanEnum.enterprise: {
        "messages_per_day": -1,
        "storage_bytes": -1,
        "workspaces": -1,
        "models": None,
    },
}


class BillingService:
    """
    Enterprise Orchestration Layer managing SaaS tiered tenant structural limits,
    thread-safe Stripe connection sessions, and non-blocking multi-tenant usage indexing.
    """

    def get_plan_limits(self, plan: PlanEnum) -> Dict[str, Any]:
        """Resolves metadata rules fallback bounds mapping against target account types."""
        return PLAN_LIMITS.get(plan, PLAN_LIMITS[PlanEnum.free])

    async def check_message_limit(self, db: AsyncSession, org: Organization) -> None:
        """
        Validates message allocation limits using an optimized bounding box date range filter
        to maximize PostgreSQL index scanning efficiency.
        """
        limits = self.get_plan_limits(org.plan)
        daily_limit = limits["messages_per_day"]
        if daily_limit == -1:
            return

        # Explicit date calculations protect the database index from full table scans
        now_utc = datetime.now(timezone.utc)
        today_start = datetime.combine(now_utc.date(), time.min, tzinfo=timezone.utc)
        today_end = datetime.combine(now_utc.date(), time.max, tzinfo=timezone.utc)

        try:
            result = await db.execute(
                select(func.count(UsageLog.id)).where(
                    and_(
                        UsageLog.org_id == org.id,
                        UsageLog.resource_type == "chat",
                        UsageLog.created_at >= today_start,
                        UsageLog.created_at <= today_end
                    )
                )
            )
            count = result.scalar() or 0
        except Exception as exc:
            logger.error(f"Database transaction layer failed during quota execution count scan: {str(exc)}", exc_info=True)
            raise

        if count >= daily_limit:
            logger.warning(f"Tenant isolation quota warning: Org '{org.id}' breached allocation ceiling metric.")
            raise PlanLimitExceededError(
                limit_type="messages_per_day",
                details={
                    "current_usage": count,
                    "max_allowed": daily_limit,
                    "org_id": str(org.id)
                }
            )

    def check_model_access(self, org: Organization, model_id: str) -> bool:
        """Determines if the tenant has permission to invoke a specific AI language model variant."""
        limits = self.get_plan_limits(org.plan)
        allowed = limits.get("models")
        if allowed is None:
            return True
        return model_id in allowed

    async def get_subscription(self, db: AsyncSession, org_id: Any) -> Optional[Subscription]:
        """Fetches the subscription record associated with the target organization identifier."""
        result = await db.execute(
            select(Subscription).where(Subscription.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_subscription(self, db: AsyncSession, org_id: Any) -> Subscription:
        """Ensures a safe database fallback initialization pattern for default tenant memberships."""
        sub = await self.get_subscription(db, org_id)
        if not sub:
            sub = Subscription(org_id=org_id, plan=PlanEnum.free, status="active")
            db.add(sub)
            await db.flush()
        return sub

    # ── Non-Blocking Async Stripe Network Execution Wrappers ──────────────────

    async def create_checkout_session(
        self,
        db: AsyncSession,
        org: Organization,
        price_id: str,
        success_url: str,
        cancel_url: str,
    ) -> str:
        """Safely dispatches high-latency checkout instantiation requests into an async thread pool."""
        if not _STRIPE_AVAILABLE or stripe is None:
            raise BillingError(
                message="Stripe infrastructure bindings are not enabled on this platform context destination.",
                status_code=503,
                code="STRIPE_UNAVAILABLE"
            )

        sub = await self.get_subscription(db, org.id)
        customer_id = sub.stripe_customer_id if sub else None

        kwargs: Dict[str, Any] = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {"org_id": str(org.id)},
        }
        if customer_id:
            kwargs["customer"] = customer_id

        loop = asyncio.get_running_loop()
        try:
            session = await loop.run_in_executor(
                None, lambda: stripe.checkout.Session.create(**kwargs)
            )
            return session.url
        except stripe.error.StripeError as e:
            logger.error(f"Stripe interaction engine breakdown during checkout generation sequence: {str(e)}", exc_info=True)
            raise BillingError(
                message=f"Gateway session processing error: {e.user_message or str(e)}",
                status_code=400,
                code="STRIPE_GATEWAY_ERROR"
            )

    async def create_portal_session(self, db: AsyncSession, org_id: Any, return_url: str) -> str:
        """Generates a secure redirect path for the customer's self-service Stripe portal allocation engine."""
        if not _STRIPE_AVAILABLE or stripe is None:
            raise BillingError(
                message="Stripe engine context configurations are not initialized.",
                status_code=503,
                code="STRIPE_UNAVAILABLE"
            )

        sub = await self.get_subscription(db, org_id)
        if not sub or not sub.stripe_customer_id:
            raise NotFoundError("No verified active billing profile links match the requesting user session details.")

        loop = asyncio.get_running_loop()
        try:
            portal = await loop.run_in_executor(
                None, lambda: stripe.billing_portal.Session.create(
                    customer=sub.stripe_customer_id,
                    return_url=return_url,
                )
            )
            return portal.url
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer portal generation anomaly intercepted: {str(e)}", exc_info=True)
            raise BillingError(
                message=f"Customer gateway allocation mismatch: {e.user_message or str(e)}",
                status_code=400,
                code="STRIPE_PORTAL_ERROR"
            )

    async def handle_stripe_webhook(self, db: AsyncSession, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Validates signatures and delegates incoming event webhooks without blocking the server's primary event loop."""
        if not _STRIPE_AVAILABLE or stripe is None:
            raise BillingError(
                message="Stripe engine integration routes are unavailable.",
                status_code=503,
                code="STRIPE_UNAVAILABLE"
            )

        loop = asyncio.get_running_loop()
        try:
            event = await loop.run_in_executor(
                None, lambda: stripe.Webhook.construct_event(
                    payload, sig_header, getattr(settings, "stripe_webhook_secret", "")
                )
            )
        except stripe.error.SignatureVerificationError as e:
            logger.warning(f"Inbound webhook dropping step: Signature verification failed. Context: {str(e)}")
            raise BillingError(
                message="Cryptographic assertion validation check dropped for suspicious inbound source signature.",
                status_code=400,
                code="WEBHOOK_SIGNATURE_INVALID"
            )

        event_type = event["type"]
        data = event["data"]["object"]

        handlers = {
            "checkout.session.completed": self._on_checkout_completed,
            "customer.subscription.updated": self._on_subscription_updated,
            "customer.subscription.created": self._on_subscription_updated,
            "customer.subscription.deleted": self._on_subscription_deleted,
            "invoice.paid": self._on_invoice_paid,
        }

        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(db, data)
                await db.commit()  # Ensure transactional updates persist cleanly
                logger.info(f"Stripe processing pipeline action synchronized: event='{event_type}'")
            except Exception as exc:
                await db.rollback()
                logger.critical(f"Transactional update execution sequence rollback following structural webhook failure: {str(exc)}", exc_info=True)
                raise BillingError(
                    message=f"Webhook transaction breakdown under element mapping: {str(exc)}",
                    status_code=500,
                    code="WEBHOOK_PROCESSING_FAILED"
                )

        return {"received": True, "event": event_type}

    async def _on_checkout_completed(self, db: AsyncSession, session: Dict[str, Any]) -> None:
        org_id = (session.get("metadata") or {}).get("org_id")
        if not org_id:
            return

        stripe_sub_id = session.get("subscription")
        customer_id = session.get("customer")
        plan = PlanEnum.pro

        if stripe_sub_id and stripe is not None:
            loop = asyncio.get_running_loop()
            stripe_sub = await loop.run_in_executor(
                None, lambda: stripe.Subscription.retrieve(stripe_sub_id)
            )
            plan = self._plan_from_stripe_sub(stripe_sub)

        sub = await self.get_subscription(db, org_id)
        if sub:
            sub.stripe_subscription_id = stripe_sub_id
            sub.stripe_customer_id = customer_id
            sub.plan = plan
            sub.status = "active"
        else:
            sub = Subscription(
                org_id=org_id,
                stripe_subscription_id=stripe_sub_id,
                stripe_customer_id=customer_id,
                plan=plan,
                status="active",
            )
            db.add(sub)

        org_result = await db.execute(select(Organization).where(Organization.id == org_id))
        org = org_result.scalar_one_or_none()
        if org:
            org.plan = plan

    async def _on_subscription_updated(self, db: AsyncSession, subscription: Dict[str, Any]) -> None:
        stripe_sub_id = subscription.get("id")
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if not sub:
            return

        plan = self._plan_from_stripe_sub(subscription)
        sub.plan = plan
        sub.status = subscription.get("status", "active")

        ts = subscription.get("current_period_end")
        if ts:
            sub.current_period_end = datetime.fromtimestamp(ts, tz=timezone.utc)

        org_result = await db.execute(select(Organization).where(Organization.id == sub.org_id))
        org = org_result.scalar_one_or_none()
        if org:
            org.plan = plan

    async def _on_subscription_deleted(self, db: AsyncSession, subscription: Dict[str, Any]) -> None:
        stripe_sub_id = subscription.get("id")
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.scalar_one_or_none()
        if not sub:
            return
        sub.plan = PlanEnum.free
        sub.status = "cancelled"
        
        org_result = await db.execute(select(Organization).where(Organization.id == sub.org_id))
        org = org_result.scalar_one_or_none()
        if org:
            org.plan = PlanEnum.free

    async def _on_invoice_paid(self, db: AsyncSession, invoice: Dict[str, Any]) -> None:
        stripe_sub_id = invoice.get("subscription")
        if not stripe_sub_id:
            return
        sub_result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = sub_result.scalar_one_or_none()
        if not sub:
            return
            
        invoice_id = invoice.get("id")
        existing = await db.execute(
            select(Invoice).where(Invoice.stripe_invoice_id == invoice_id)
        )
        if existing.scalar_one_or_none():
            return  # Idempotent guard step skips duplicates safely

        db.add(Invoice(
            org_id=sub.org_id,
            stripe_invoice_id=invoice_id,
            amount_usd=(invoice.get("amount_paid") or 0) / 100,
            status="paid",
            pdf_url=invoice.get("invoice_pdf"),
            paid_at=datetime.now(timezone.utc),
        ))

    def _plan_from_stripe_sub(self, subscription: Dict[str, Any]) -> PlanEnum:
        """Maps specific price IDs from inbound payloads to internal systemic application tier states."""
        items = (subscription.get("items") or {}).get("data", [])
        if not items:
            return PlanEnum.pro
        price_id = (items[0].get("price") or {}).get("id", "")
        
        team_price_id = getattr(settings, "stripe_team_price_id", "price_team_placeholder")
        pro_price_id = getattr(settings, "stripe_pro_price_id", "price_pro_placeholder")
        
        if price_id == team_price_id:
            return PlanEnum.team
        if price_id == pro_price_id:
            return PlanEnum.pro
        return PlanEnum.pro

    # ── Usage Management & Data Extraction Analytics ─────────────────────────

    async def get_usage_summary(self, db: AsyncSession, org_id: Any) -> Dict[str, Any]:
        """Returns a high-speed aggregations payload analysis metrics block."""
        result = await db.execute(
            select(
                func.sum(UsageLog.tokens_in).label("tokens_in"),
                func.sum(UsageLog.tokens_out).label("tokens_out"),
                func.sum(UsageLog.cost_usd).label("cost_usd"),
                func.count(UsageLog.id).label("requests"),
            ).where(UsageLog.org_id == org_id)
        )
        row = result.one()
        return {
            "total_tokens_in": row.tokens_in or 0,
            "total_tokens_out": row.tokens_out or 0,
            "total_cost_usd": round(row.cost_usd or 0.0, 6),
            "total_requests": row.requests or 0,
        }


billing_service = BillingService()