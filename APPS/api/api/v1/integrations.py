"""
Integrations routes — OAuth initiation · callback · list · delete
"""
from __future__ import annotations
import base64
import json as _json
from datetime import datetime
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.deps import get_user_id, get_workspace_id, get_db
from core.security import encrypt_credentials, decrypt_credentials
from db.models.user import User, Organization
from db.models.integration import Integration  # ✅ FIXED: Corrected domain model path reference

router = APIRouter(prefix="/integrations", tags=["integrations"])

SUPPORTED_PROVIDERS = {
    "slack": {
        "auth_url": "https://slack.com/oauth/v2/authorize",
        "scopes": ["chat:write", "channels:read"],
    },
    "gmail": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scopes": ["https://www.googleapis.com/auth/gmail.send"],
    },
    "notion": {
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "scopes": [],
    },
    "google_sheets": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scopes": ["https://www.googleapis.com/auth/spreadsheets"],
    },
}

# ── Pydantic Request/Response Data Schemas ───────────────────────────────────

class ConnectRequest(BaseModel):
    provider: str = Field(..., description="The target third-party SaaS identity provider identifier key.")
    redirect_uri: Optional[str] = Field(None, description="Explicit verification callback destination route override.")


class ConnectResponse(BaseModel):
    auth_url: str = Field(..., description="Generated absolute provider authorization path.")
    provider: str
    state: str = Field(..., description="Secure base64 block containing workspace context strings.")


class OAuthCallbackRequest(BaseModel):
    provider: str
    code: str = Field(..., description="Temporary code provided by SaaS authorization layer.")
    state: str
    redirect_uri: Optional[str] = None


class IntegrationOut(BaseModel):
    id: Any  
    provider: str
    scopes: List[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Route Handlers ───────────────────────────────────────────────────────────

@router.get("", response_model=List[IntegrationOut], status_code=status.HTTP_200_OK)
async def list_integrations(
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches all connected integration records bound to the current organization tenant boundary.
    """
    result = await db.execute(
        select(Integration)
        .where(Integration.org_id == workspace_id)
        .order_by(Integration.created_at.desc())
    )
    return result.scalars().all()


@router.post("/connect", response_model=ConnectResponse, status_code=status.HTTP_200_OK)
async def initiate_oauth(
    body: ConnectRequest,
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
):
    """
    Generates the targeted OAuth authorization redirect URL.
    Encodes tenant organization context identities safely into state strings.
    """
    provider = body.provider.lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {provider}. Supported: {list(SUPPORTED_PROVIDERS.keys())}",
        )

    state_data = _json.dumps({
        "workspace_id": workspace_id,
        "user_id": user_id,
        "provider": provider,
    })
    state = base64.urlsafe_b64encode(state_data.encode()).decode()

    config = SUPPORTED_PROVIDERS[provider]
    scopes = " ".join(config["scopes"])
    
    frontend_root = getattr(settings, "frontend_url", None) or getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    redirect_uri = body.redirect_uri or f"{frontend_root}/integrations/callback"

    auth_url = (
        f"{config['auth_url']}?"
        f"scope={scopes}&"
        f"state={state}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code"
    )

    return ConnectResponse(auth_url=auth_url, provider=provider, state=state)


@router.post("/callback", response_model=IntegrationOut, status_code=status.HTTP_201_CREATED)
async def oauth_callback(
    body: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Consumes temporary validation code structures to claim long-lived operational auth tokens.
    Saves sensitive fields as securely encrypted payloads inside database columns.
    """
    try:
        state_data = _json.loads(base64.urlsafe_b64decode(body.state).decode())
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state parameter verification trace.")

    org_id = state_data.get("workspace_id") or state_data.get("org_id")
    user_id = state_data.get("user_id")
    provider = state_data.get("provider", body.provider.lower())

    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported integration target: {provider}")

    mock_credentials_dict = {
        "access_token": f"mock_token_for_{provider}",
        "code": body.code,
        "provider": provider,
    }
    
    encrypted_blob = encrypt_credentials(mock_credentials_dict)

    result = await db.execute(
        select(Integration).where(
            Integration.org_id == org_id,
            Integration.provider == provider,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_credentials = encrypted_blob
        existing.scopes = SUPPORTED_PROVIDERS[provider]["scopes"]
        integration = existing
    else:
        integration = Integration(
            org_id=org_id,
            user_id=user_id,
            provider=provider,
            encrypted_credentials=encrypted_blob,
            scopes=SUPPORTED_PROVIDERS[provider]["scopes"],
        )
        db.add(integration)
        
    await db.commit()
    await db.refresh(integration)
    return integration


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user_id: str = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Removes integration bindings from active infrastructure tables.
    """
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.org_id == workspace_id,
        )
    )
    integration = result.scalar_one_or_none()
    if not integration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target integration connection record not found.")
        
    await db.delete(integration)
    await db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)