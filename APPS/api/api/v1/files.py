from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_user_id, get_workspace_id, get_db
from core.exceptions import AppError, to_http_exception

router = APIRouter(prefix="/files", tags=["files"])


# ── Pydantic Request/Response Schemas (Pydantic V2 Compliant) ────────────────

class PresignedUploadRequest(BaseModel):
    filename: str = Field(..., description="The exact baseline file string name.")
    content_type: str = Field(..., description="The explicit document MIME type classification.")
    size_bytes: int = Field(..., ge=1, description="Total size footprint of the targeted payload payload.")
    knowledge_base_id: Optional[str] = Field(None, description="Target workspace knowledge indexing cluster.")


class PresignedUploadResponse(BaseModel):
    file_id: str
    filename: str
    upload_url: str
    s3_key: str


class FileItemResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    knowledge_base_id: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


class PaginatedFileResponse(BaseModel):
    items: List[FileItemResponse]
    total: int
    page: int
    page_size: int


# ── Lazy-Evaluating Dependency Provider for Service Tier ─────────────────────

async def get_rag_service(db: AsyncSession = Depends(get_db)):
    """
    Dependency provider that delays loading the service class. 
    This structural barrier fully eliminates top-level circular import loops.
    """
    from services.rag_service import RagService
    return RagService(db)


# ── Controller Endpoints ─────────────────────────────────────────────────────

@router.post("/upload", response_model=PresignedUploadResponse, status_code=status.HTTP_201_CREATED)
async def get_presigned_upload_url(
    body: PresignedUploadRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Generates a secure presigned S3 storage upload URL bound to the tenant workspace.
    """
    try:
        result = await service.create_presigned_upload(
            workspace_id=workspace_id,
            user_id=user_id,
            filename=body.filename,
            content_type=body.content_type,
            size_bytes=body.size_bytes,
            knowledge_base_id=body.knowledge_base_id,
        )
        return result
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("", response_model=PaginatedFileResponse, status_code=status.HTTP_200_OK)
async def list_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    knowledge_base_id: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Returns a paginated list of documents matching isolation tenant boundary attributes.
    """
    try:
        files, total = await service.list_files(
            workspace_id=workspace_id,
            page=page,
            page_size=page_size,
            status_filter=status_filter,
            knowledge_base_id=knowledge_base_id,
        )
        return {
            "items": files,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("/{file_id}", response_model=FileItemResponse, status_code=status.HTTP_200_OK)
async def get_file(
    file_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Retrieves the complete profile data records of a processed file block.
    """
    try:
        file = await service.get_file(
            file_id=file_id, 
            workspace_id=workspace_id
        )
        return file
    except AppError as exc:
        raise to_http_exception(exc)


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
) -> Response:
    """
    Purges a tracked document from vector indexes and storage nodes.
    Returns a raw empty Response to comply with strict HTTP 204 requirements.
    """
    try:
        await service.delete_file(
            file_id=file_id,
            workspace_id=workspace_id,
            user_id=user_id,
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except AppError as exc:
        raise to_http_exception(exc)