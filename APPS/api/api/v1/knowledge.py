from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_user_id, get_workspace_id, get_db
from core.exceptions import AppError, to_http_exception

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


# ── Pydantic Request/Response Data Schemas (Pydantic V2 Compliant) ──

class CreateKnowledgeBaseRequest(BaseModel):
    name: str = Field(..., description="The name of the knowledge base cluster.")
    description: Optional[str] = Field(None, description="Detailed explanatory log details.")
    embedding_model: str = Field("text-embedding-3-small", description="The targeted text vectorizer model.")
    chunk_strategy: str = Field("fixed", description="The character parsing splitting logic pattern.")


class QueryKnowledgeBaseRequest(BaseModel):
    query: str = Field(..., description="The context request question string.")
    top_k: int = Field(5, ge=1, le=50, description="Maximum amount of chunk results to yield.")
    min_score: float = Field(0.5, ge=0.0, le=1.0, description="Minimal similarity validation barrier.")


class KnowledgeBaseResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    embedding_model: str
    chunk_strategy: str

    # Fixed: Strict Pydantic V2 configuration definition style
    model_config = ConfigDict(from_attributes=True)


class PaginatedKnowledgeBaseResponse(BaseModel):
    items: List[KnowledgeBaseResponse]
    total: int
    page: int
    page_size: int


class ChunkResultItem(BaseModel):
    content: str
    chunk_index: int
    document_id: str
    metadata: dict = Field(default_factory=dict)


class QueryResultsResponse(BaseModel):
    results: List[ChunkResultItem]


# ── Dependency Provider for Service Tier (Circular Interlock Shield) ──

async def get_rag_service(db: AsyncSession = Depends(get_db)):
    """
    Dependency provider that delays loading the service class.
    This structural barrier completely eliminates top-level circular import loops.
    """
    from services.rag_service import RagService
    return RagService(db)


# ── Route Handlers ───────────────────────────────────────────────────

@router.get("", response_model=PaginatedKnowledgeBaseResponse, status_code=status.HTTP_200_OK)
async def list_knowledge_bases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Retrieves all valid knowledge management zones linked to the caller's active tenant workspace.
    """
    try:
        if hasattr(service, "list_knowledge_bases_paginated"):
            kbs, total = await service.list_knowledge_bases_paginated(
                workspace_id=workspace_id, page=page, page_size=page_size
            )
        else:
            raw_kbs = await service.list_knowledge_bases(workspace_id=workspace_id)
            total = len(raw_kbs)
            start_idx = (page - 1) * page_size
            kbs = raw_kbs[start_idx : start_idx + page_size]

        return {
            "items": kbs,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    body: CreateKnowledgeBaseRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Initializes a distinct, secure storage cluster for tenant data parsing and vector search.
    """
    try:
        kb = await service.create_knowledge_base(
            workspace_id=workspace_id,
            name=body.name,
            description=body.description,
            **({
                "embedding_model": body.embedding_model, 
                "chunk_strategy": body.chunk_strategy
            } if hasattr(service.create_knowledge_base, "__code__") 
               and "embedding_model" in service.create_knowledge_base.__code__.co_varnames 
               else {})
        )
        return kb
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse, status_code=status.HTTP_200_OK)
async def get_knowledge_base(
    kb_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Locates and returns an individual knowledge base profile, verifying isolation boundaries.
    """
    try:
        kb = await service.get_knowledge_base(
            kb_id=kb_id, 
            workspace_id=workspace_id
        )
        return kb
    except AppError as exc:
        raise to_http_exception(exc)


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(
    kb_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
) -> Response:
    """
    Purges an existing knowledge cluster profile and unlinks its indexed document blocks.
    """
    try:
        if hasattr(service, "delete_knowledge_base"):
            await service.delete_knowledge_base(kb_id=kb_id, workspace_id=workspace_id)
        else:
            await service.delete_file(file_id=kb_id, workspace_id=workspace_id, user_id=user_id)
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("/{kb_id}/query", response_model=QueryResultsResponse, status_code=status.HTTP_200_OK)
async def query_knowledge_base(
    kb_id: str,
    body: QueryKnowledgeBaseRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_rag_service),
):
    """
    Performs hybrid context retrieval on database text chunks to build specialized prompt extensions.
    """
    try:
        results = await service.query(
            workspace_id=workspace_id,
            kb_id=kb_id,
            query=body.query,
            top_k=body.top_k,
            **({"min_score": body.min_score} 
               if hasattr(service.query, "__code__") 
               and "min_score" in service.query.__code__.co_varnames 
               else {})
        )
        return {"results": results}
    except AppError as exc:
        raise to_http_exception(exc)