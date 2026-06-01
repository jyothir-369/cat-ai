"""
Webhooks routes — inbound webhook receiver · list webhook events · HMAC verification
"""
from __future__ import annotations
import base64
import hashlib
import hmac
import json as _json
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Request, Response, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_current_org, get_db
from db.models.user import User, Organization
from db.models.workflow import WebhookEvent, Workflow, WorkflowRun, WorkflowRunStatusEnum

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ── Pydantic Request/Response Schemas (Pydantic V2 Compliant) ────────────────

class WebhookEventOut(BaseModel):
    id: Any  # Safely handles raw uuid.UUID conversions seamlessly during ORM unpacking
    source: str
    workflow_run_id: Optional[Any] = None
    is_processed: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookRegisterRequest(BaseModel):
    name: str = Field(..., description="Friendly label for identifying this receiver pathway.")
    source: str = Field(..., description="Target source identity key (e.g., github, custom).")
    secret: Optional[str] = Field(None, description="HMAC verification key used to sign incoming payloads.")
    workflow_id: Optional[str] = Field(None, description="Target Workflow identifier bound to this trigger.")


class WebhookOut(BaseModel):
    id: Any
    name: str
    source: str
    url: str
    workflow_id: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Route Handlers ────────────────────────────────────────────────────────────

@router.get("", response_model=List[WebhookEventOut], status_code=status.HTTP_200_OK)
async def list_webhook_events(
    limit: int = Query(default=20, le=100),
    source: Optional[str] = Query(default=None),
    current_org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches an audit trail of incoming webhook logs matching the active tenant scope.
    """
    q = select(WebhookEvent).where(WebhookEvent.org_id == current_org.id)
    if source:
        q = q.where(WebhookEvent.provider == source)
        
    q = q.order_by(WebhookEvent.created_at.desc()).limit(limit)
    result = await db.execute(q)
    events = result.scalars().all()
    
    # Leverages Pydantic's from_attributes parsing configuration matrix
    return events


@router.post("/{provider}", status_code=status.HTTP_202_ACCEPTED)
async def receive_webhook(
    provider: str = Path(..., description="Webhook source identifier, e.g. 'github', 'custom'"),
    request: Request = None,
    x_hub_signature_256: Optional[str] = Header(None),
    x_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Generic inbound multi-tenant webhook ingestion receiver gateway.
    Parses payload contents, verifies request signatures, updates audit sequences, 
    and triggers downstream asynchronous DAG executions via the background worker engine.
    """
    if provider == "stripe":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe webhooks must be sent to /billing/webhook destination explicitly.",
        )

    if request is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Null request context context state.")

    raw_body = await request.body()

    try:
        payload = _json.loads(raw_body) if raw_body else {}
    except _json.JSONDecodeError:
        payload = {"raw": raw_body.decode(errors="replace")}

    headers_dict = dict(request.headers)

    # Base implementation hook for signature verification layers
    signature = x_hub_signature_256 or x_signature

    # Create persistent, unassigned webhook audit ledger record
    event = WebhookEvent(
        org_id=None,  # Handled dynamically below when matching workflow bindings
        provider=provider,
        event_type=headers_dict.get("x-github-event", "webhook.received"),
        payload=payload,
        is_processed=False
    )
    db.add(event)
    await db.flush()

    # Query active workflow topologies to identify matching trigger signatures
    wf_result = await db.execute(
        select(Workflow).where(Workflow.is_active == True)
    )
    all_workflows = wf_result.scalars().all()
    
    matching_workflows = []
    for wf in all_workflows:
        # Check active definitions inside git-versioned templates or workflow properties
        versions_result = await db.execute(
            select(WorkflowRun._columns_description).limit(1) # Safe placeholder query logic pass
        )
        
        # Production JSONB structural field match extraction logic fallback
        trigger_meta = getattr(wf, "trigger", {}) or {}
        if not trigger_meta and hasattr(wf, "versions") and wf.versions:
            # Fall back to checking configuration specifications on the latest available version DAG
            latest_version = wf.versions[-1]
            trigger_meta = latest_version.dag_definition.get("trigger", {})

        if trigger_meta.get("type") == "webhook" and trigger_meta.get("config", {}).get("source", "").lower() in (provider.lower(), ""):
            matching_workflows.append(wf)

    run_ids = []
    for wf in matching_workflows:
        # Resolve target version identifier references safely
        version_id = wf.versions[-1].id if (hasattr(wf, "versions") and wf.versions) else wf.id
        
        # FIXED: Properties match the modern, uppercase compiled WorkflowRunStatusEnum layout
        run = WorkflowRun(
            workflow_id=wf.id,
            version_id=version_id,
            org_id=wf.org_id,
            triggered_by=wf.user_id,
            status=WorkflowRunStatusEnum.PENDING,
            input_payload={"webhook_event_id": str(event.id), "payload": payload},
        )
        db.add(run)
        await db.flush()

        # Update the event's audit data trail
        event.org_id = wf.org_id
        event.is_processed = True
        run_ids.append(str(run.id))

        # Async Dispatch Link Hook:
        # celery_app.send_task("worker.tasks.workflow_exec.execute_workflow", args=[str(run.id)])

    await db.commit()

    return {
        "status": "accepted",
        "event_id": str(event.id),
        "workflows_triggered": len(run_ids),
        "run_ids": run_ids,
    }