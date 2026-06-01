from __future__ import annotations

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db
from core.exceptions import AppError
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    org_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    try:
        result = await service.register(
            email=body.email,
            password=body.password,
            name=body.name,
            org_name=body.org_name or f"{body.name}'s Workspace",
        )
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    cookie_path = request.scope.get("root_path", "") + "/auth"
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path=cookie_path or "/api/v1/auth",
    )
    return TokenResponse(access_token=result["access_token"])


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    try:
        result = await service.login(email=body.email, password=body.password)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    cookie_path = request.scope.get("root_path", "") + "/auth"
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path=cookie_path or "/api/v1/auth",
    )
    return TokenResponse(access_token=result["access_token"])


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    token = body.refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    service = AuthService(db)
    try:
        result = await service.refresh_token(token)
    except AppError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    cookie_path = request.scope.get("root_path", "") + "/auth"
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
        path=cookie_path or "/api/v1/auth",
    )
    return TokenResponse(access_token=result["access_token"])


@router.get("/me")
async def me(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> dict:
    """
    Retrieves currently authenticated identity metadata profiles.
    Correctly unwraps claims context dictionary elements to avoid dynamic attribute failures.
    """
    # Fallback to key-value extractions to safely process dict objects from core/deps.py
    user_id = current_user.get("sub", current_user.get("id", ""))
    created_at_val = current_user.get("created_at")
    
    if hasattr(created_at_val, "isoformat"):
        formatted_date = created_at_val.isoformat()
    elif isinstance(created_at_val, str):
        formatted_date = created_at_val
    else:
        formatted_date = None

    return {
        "id": str(user_id),
        "email": current_user.get("email"),
        "name": current_user.get("name"),
        "avatar_url": current_user.get("avatar_url"),
        "is_active": current_user.get("is_active", True),
        "created_at": formatted_date,
    }


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def logout(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    token = request.cookies.get("refresh_token")

    if token:
        service = AuthService(db)
        await service.revoke_refresh_token(token)

    response = Response(status_code=status.HTTP_204_NO_CONTENT)

    cookie_path = request.scope.get("root_path", "") + "/auth"
    response.delete_cookie(
        key="refresh_token",
        path=cookie_path or "/api/v1/auth",
        httponly=True,
        secure=True,
        samesite="lax",
    )

    return response