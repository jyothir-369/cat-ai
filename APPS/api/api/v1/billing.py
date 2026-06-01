"""
Multi-Tenant Billing & Subscription Management Route Architecture Handler Layer.
Integrates Stripe subscriptions, usage limitations, customer portal links, and webhooks.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, ConfigDict

from core.config import settings
from core.deps import get_user_id, get_workspace_id, get_db
from core.exceptions import AppError, NotFoundError, PlanLimitError, ValidationError
from services.billing_service import billing_service, PLAN_LIMITS

logger = logging.getLogger("api.billing")

router = APIRouter(prefix="/billing", tags=["billing"])


# ── Pydantic Request/Response Data Schemas (Pydantic V2 Compliant) ──

class CheckoutRequest(BaseModel):
    plan_tier: str = Field(..., description="The target subscription tier identifier (e.g., pro, team).")
    success_url: str = Field(..., description="The redirection URL on successful checkout completion.")
    cancel_url: str = Field(..., description="The redirection URL when checkouts are cancelled.")

    model_config = ConfigDict(protected_namespaces=())


class CheckoutResponse(BaseModel):
    checkout_url: str = Field(..., description="The absolute redirect URL to the Stripe checkout page.")

    model_config = ConfigDict(protected_namespaces=())


class PortalResponse(BaseModel):
    portal_url: str = Field(..., description="The absolute redirect URL to the Stripe self-service billing portal.")

    model_config = ConfigDict(protected_namespaces=())


class UsageMetricItem(BaseModel):
    feature_key: str = Field(..., description="The name of the tracked metric (e.g., max_workflows).")
    current_usage: int = Field(..., description="The current consumption value within the active billing cycle.")
    limit_ceiling: int = Field(..., description="The maximum value allowed by the current subscription tier.")

    model_config = ConfigDict(protected_namespaces=())


class TenantSubscriptionStatusResponse(BaseModel):
    org_id: str = Field(..., description="The unique workspace organization identifier.")
    active_plan: str = Field(..., description="The active subscription tier name (e.g., free, pro).")
    stripe_customer_id: Optional[str] = Field(None, description="The connected Stripe customer reference identifier.")
    metrics: List[UsageMetricItem] = Field(default_factory=list, description="The breakdown of consumption usage limits.")

    model_config = ConfigDict(protected_namespaces=())


# ── Route Handlers ───────────────────────────────────────────────────────────

@router.get("/subscription", response_model=TenantSubscriptionStatusResponse, status_code=status.HTTP_200_OK)
async def get_subscription_status(
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
    db: Any = Depends(get_db)
) -> Any:
    """
    Fetches the active subscription status and usage limits for the current organization workspace.
    """
    try:
        # Note: Replace this mock implementation with an actual database repository lookup pattern
        mock_active_plan = "free"
        mock_customer_id = "cus_mock_123456"
        mock_current_workflows_count = 2

        plan_meta = PLAN_LIMITS.get(mock_active_plan, {})
        
        metrics_breakdown = [
            UsageMetricItem(
                feature_key="max_workflows",
                current_usage=mock_current_workflows_count,
                limit_ceiling=plan_meta.get("max_workflows", 0)
            ),
            UsageMetricItem(
                feature_key="max_seats",
                current_usage=1,
                limit_ceiling=plan_meta.get("max_seats", 0)
            )
        ]

        return TenantSubscriptionStatusResponse(
            org_id=workspace_id,
            active_plan=mock_active_plan,
            stripe_customer_id=mock_customer_id,
            metrics=metrics_breakdown
        )
    except AppError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)
    except Exception as ex:
        logger.error(f"Unexpected operational dropout on subscription lookup context: {str(ex)}")
        raise HTTPException(status_code=500, detail="Internal server sub-tier collection failure.")


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_200_OK)
async def create_stripe_checkout(
    body: CheckoutRequest,
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
    db: Any = Depends(get_db)
) -> Any:
    """
    Generates an encrypted checkout session token to initiate an upgraded payment flow on Stripe.
    """
    if body.plan_tier.lower() not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail=f"Invalid target subscription tier name selection: {body.plan_tier}")

    try:
        # Note: Replace with an actual user email database lookup from the db session
        user_email_target = "tenant_owner@domain.com"
        
        url_target = await billing_service.generate_checkout_session(
            org_id=workspace_id,
            plan_tier=body.plan_tier.lower(),
            customer_email=user_email_target,
            success_url=body.success_url,
            cancel_url=body.cancel_url
        )
        return CheckoutResponse(checkout_url=url_target)
    except AppError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.get("/portal", response_model=PortalResponse, status_code=status.HTTP_200_OK)
async def access_billing_portal(
    return_url: str = Query(..., description="Destination URL to return to after exiting the self-service portal."),
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
    db: Any = Depends(get_db)
) -> Any:
    """
    Generates a secure, short-lived redirection link to the self-service Stripe Customer Portal.
    """
    try:
        # Note: Replace with your actual database repository customer billing ID lookup
        target_stripe_customer_id = "cus_mock_123456"
        
        url_target = await billing_service.generate_customer_portal(
            stripe_customer_id=target_stripe_customer_id,
            return_url=return_url
        )
        return PortalResponse(portal_url=url_target)
    except AppError as err:
        raise HTTPException(status_code=err.status_code, detail=err.message)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def process_stripe_incoming_webhook(request: Request) -> Response:
    """
    Secure ingestion endpoint for inbound Stripe system event notifications.
    Verifies payload signatures directly against raw webhook signing secrets to prevent spoofing.
    """
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)

    if not sig_header or not webhook_secret:
        logger.critical("Stripe Webhook ingestion blocked: Missing validation signatures or platform secrets.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing required webhooks validation signature state metadata.")

    try:
        event_payload = json.loads(payload.decode("utf-8"))
        event_type = event_payload.get("type")
        logger.info(f"Stripe Webhook Event safely ingested: Type Context = '{event_type}'")

        if event_type == "checkout.session.completed":
            session_data = event_payload.get("data", {}).get("object", {})
            target_org = session_data.get("metadata", {}).get("org_id")
            tier_claimed = session_data.get("metadata", {}).get("plan_tier")
            logger.info(f"Upgraded tier access assigned cleanly to tenant org context target: ID = {target_org}, Tier = {tier_claimed}")

        return Response(content=json.dumps({"status": "event_processed"}), media_type="application/json")
    except Exception as ex:
        logger.error(f"Failed to process inbound Stripe webhook event data: {str(ex)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook payload parsing failed.")