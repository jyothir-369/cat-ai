import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from core.exceptions import AuthenticationError, AuthorizationError, ConflictError, NotFoundError
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_password,
    verify_password,
)
from db.repos.user_repo import UserRepo


class AuthService:
    """
    Business orchestration logic layer for managing user lifecycles, 
    workspace isolation provisioning, cryptographic operations, and JWT token rotation.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepo(db)

    async def register(self, email: str, name: str, password: str) -> Dict[str, Any]:
        """
        Registers a new user, provisions an isolated personal workspace, 
        and issues OAuth2 compliant token credentials.
        """
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictError(f"Email '{email}' is already associated with an active account.")

        hashed = hash_password(password)
        user = await self.repo.create(email=email, name=name, hashed_password=hashed)

        # Multi-Tenant Workspace Provisioning Core Module Layer
        slug = email.split("@")[0].lower().replace(".", "-")[:50] + f"-{str(user.id)[:8]}"
        
        # Aligned method signature to match workspace multi-tenancy rules instead of orgs
        workspace = await self.repo.create_workspace(
            name=f"{name}'s Workspace", 
            slug=slug, 
            owner_id=user.id
        )

        tokens = self._issue_tokens(user, workspace_id=workspace.id)
        return {"user": user, **tokens}

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Validates user identity vectors and refreshes login audit markers.
        """
        user = await self.repo.get_by_email(email)
        
        # Defensive validation prevents user enumeration attacks
        if not user or not getattr(user, "hashed_password", None):
            raise AuthenticationError("Invalid email or password.")
            
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password.")
            
        if not getattr(user, "is_active", True):
            raise AuthorizationError("Account is currently deactivated. Contact platform systems.")

        # Update login timing metadata inside the transactional frame
        await self.repo.update(user, last_login=datetime.now(timezone.utc))
        
        # Fetch the primary user workspace context to seed the security claims
        workspaces = await self.repo.get_user_workspaces(user.id)
        primary_workspace_id = workspaces[0].id if workspaces else None

        tokens = self._issue_tokens(user, workspace_id=primary_workspace_id)
        return {"user": user, **tokens}

    async def refresh(self, refresh_token: str) -> Dict[str, Any]:
        """
        Validates a token refresh rotation operation and returns a new set of security claims.
        """
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token deployment target type.")
        except (JWTError, KeyError, ValueError):
            raise AuthenticationError("Invalid or expired refresh token data signatures.")

        subject_id = payload.get("sub")
        if not subject_id:
            raise AuthenticationError("Malformed token context signature: missing sub claim.")

        try:
            user_uuid = uuid.UUID(subject_id)
        except ValueError:
            raise AuthenticationError("Malformed token identity token configuration.")

        user = await self.repo.get_by_id(user_uuid)
        if not user or not getattr(user, "is_active", True):
            raise AuthenticationError("The referenced account record is missing or inactive.")

        # Safely extract workspace claims state directly from payload contexts
        current_workspace_id = payload.get("workspace_id")
        parsed_workspace_uuid = uuid.UUID(current_workspace_id) if current_workspace_id else None

        return self._issue_tokens(user, workspace_id=parsed_workspace_uuid)

    async def get_user_workspaces(self, user_id: uuid.UUID) -> List[Any]:
        """
        Fetches all workspace boundaries available to a specific user.
        """
        return await self.repo.get_user_workspaces(user_id)

    def _issue_tokens(self, user: Any, workspace_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Generates signed asymmetric cryptographic string sets for access and refresh flows.
        """
        base_claims = {
            "sub": str(user.id),
            "email": user.email,
            "workspace_id": str(workspace_id) if workspace_id else None,
        }
        
        # Build independent operational tracking structures for token validation
        access_claims = {**base_claims, "type": "access"}
        refresh_claims = {**base_claims, "type": "refresh"}
        
        return {
            "access_token": create_access_token(access_claims),
            "refresh_token": create_refresh_token(refresh_claims),
            "token_type": "bearer",
        }

    async def create_api_key(self, workspace_id: uuid.UUID, user_id: uuid.UUID, name: str) -> Dict[str, Any]:
        """
        Generates an API key, applies cryptographic hashing, and saves it to the database.
        """
        raw_key, hashed_key = generate_api_key()
        
        # Execute key binding directly via repository controls to ensure transaction consistency
        api_key_record = await self.repo.create_api_key_record(
            workspace_id=workspace_id,
            user_id=user_id,
            name=name,
            key_hash=hashed_key
        )
        
        return {
            "id": str(api_key_record.id),
            "key": raw_key,
            "name": name
        }