from __future__ import annotations
from typing import List, Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_user_id, get_workspace_id, get_db
from core.exceptions import AppError, to_http_exception

router = APIRouter(prefix="/workflows", tags=["workflows"])


# ── Pydantic Request/Response Schemas (Pydantic V2 Compliant) ────────────────

class CreateWorkflowRequest(BaseModel):
    name: str = Field(..., description="Unique human-readable label for the process pipeline.")
    description: Optional[str] = Field(None, description="Detailed layout data documenting step rules.")
    trigger: Dict[str, Any] = Field(..., description="Configuration payload dictating automation entry blocks.")
    steps: List[Dict[str, Any]] = Field(default_factory=list, description="Array of execution actions.")
    edges: List[Dict[str, Any]] = Field(default_factory=list, description="Topological map linking process routing nodes.")
    is_active: bool = Field(True, description="State control toggle.")


class UpdateWorkflowRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[Dict[str, Any]] = None
    steps: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class TriggerWorkflowRequest(BaseModel):
    context: Dict[str, Any] = Field(default_factory=dict, description="Initial parameters forwarded into active steps.")


class ApproveStepRequest(BaseModel):
    token: str = Field(..., description="Secure validation hash verifying step authority permissions.")
    action: str = Field(..., description="State resolution decision parameter. Must map to: 'approve' | 'reject'")
    comment: Optional[str] = Field(None, description="Optional annotations outlining authorization decisions.")


class WorkflowResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: Optional[str] = None
    trigger: Dict[str, Any]
    steps: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    is_active: bool

    model_config = {
        "from_attributes": True
    }


class PaginatedWorkflowResponse(BaseModel):
    items: List[WorkflowResponse]
    total: int
    page: int
    page_size: int


class WorkflowRunResponse(BaseModel):
    id: str
    workflow_id: str
    status: str
    context: Dict[str, Any]
    current_step_id: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


# ── Dependency Provider for Service Tier (Circular Interlock Shield) ──

async def get_workflow_service(db: AsyncSession = Depends(get_db)):
    """
    Dependency provider that delays loading the service class.
    This structural barrier completely eliminates top-level circular import loops.
    """
    from services.workflow_service import WorkflowService
    return WorkflowService(db)


# ── Route Handlers ───────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedWorkflowResponse, status_code=status.HTTP_200_OK)
async def list_workflows(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Retrieves all workflows scoped to the active workspace tenant.
    """
    try:
        workflows, total = await service.list(
            workspace_id=workspace_id, page=page, page_size=page_size
        )
        return {
            "items": workflows,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: CreateWorkflowRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Registers a new automated tracking system map into the platform database.
    """
    try:
        workflow = await service.create(
            workspace_id=workspace_id,
            user_id=user_id,
            name=body.name,
            description=body.description,
            trigger=body.trigger,
            steps=body.steps,
            edges=body.edges,
            is_active=body.is_active,
        )
        return workflow
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("/{workflow_id}", response_model=WorkflowResponse, status_code=status.HTTP_200_OK)
async def get_workflow(
    workflow_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Locates an active workflow record matching isolation tenant boundaries.
    """
    try:
        workflow = await service.get(
            workflow_id=workflow_id, workspace_id=workspace_id
        )
        return workflow
    except AppError as exc:
        raise to_http_exception(exc)


@router.patch("/{workflow_id}", response_model=WorkflowResponse, status_code=status.HTTP_200_OK)
async def update_workflow(
    workflow_id: str,
    body: UpdateWorkflowRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Updates operational attributes of a workflow.
    """
    try:
        workflow = await service.update(
            workflow_id=workflow_id,
            workspace_id=workspace_id,
            updates=body.model_dump(exclude_none=True),
        )
        return workflow
    except AppError as exc:
        raise to_http_exception(exc)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
) -> Response:
    """
    Removes a workflow profile completely from active platform tracking nodes.
    Returns a raw empty Response to comply with strict HTTP 204 specifications.
    """
    try:
        await service.delete(
            workflow_id=workflow_id, workspace_id=workspace_id
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_workflow(
    workflow_id: str,
    body: TriggerWorkflowRequest,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Instantiates an asynchronous execution pipeline trace tracking workflow action items.
    """
    try:
        run = await service.trigger(
            workflow_id=workflow_id,
            workspace_id=workspace_id,
            trigger_type="manual",
            context=body.context,
        )
        return run
    except AppError as exc:
        raise to_http_exception(exc)


@router.get("/runs/{run_id}", response_model=WorkflowRunResponse, status_code=status.HTTP_200_OK)
async def get_run_status(
    run_id: str,
    user_id: str = Depends(get_user_id),
    workspace_id: str = Depends(get_workspace_id),
    service=Depends(get_workflow_service),
):
    """
    Monitors status data tracking state logs inside an engine execution block.
    """
    try:
        run = await service.get_run(run_id=run_id, workspace_id=workspace_id)
        return run
    except AppError as exc:
        raise to_http_exception(exc)


@router.post("/runs/{run_id}/approve", status_code=status.HTTP_200_OK)
async def approve_step(
    run_id: str,
    body: ApproveStepRequest,
    service=Depends(get_workflow_service),
) -> Dict[str, Any]:
    """
    Evaluates manual validation checkpoints to advance blocked steps or halt pipelines.
    """
    try:
        result = await service.handle_approval(
            run_id=run_id,
            token=body.token,
            action=body.action,
            comment=body.comment,
        )
        return result
    except AppError as exc:
        raise to_http_exception(exc)