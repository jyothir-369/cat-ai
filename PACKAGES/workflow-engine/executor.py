from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from packages.workflow_engine.dag import DAG, Step
from packages.workflow_engine.state import (
    StepRunState,
    StepRunStatus,
    WorkflowRunState,
    WorkflowRunStatus,
)

logger = logging.getLogger(__name__)

UTC = timezone.utc


class ApprovalRequired(Exception):
    """Raised when an approval step pauses execution."""

    def __init__(self, step_id: str, run_id: str, approval_token: str):
        super().__init__(f"Approval required for step {step_id}")
        self.step_id = step_id
        self.run_id = run_id
        self.approval_token = approval_token


class WorkflowExecutor:
    """
    Executes a workflow DAG step by step with:
    - topological ordering
    - retry handling (exponential backoff)
    - approval step pausing
    - durable state persistence
    - conditional edge evaluation
    """

    def __init__(
        self,
        db_session,
        notification_service=None,
        ai_orchestrator=None,
    ):
        self.db = db_session
        self.notifications = notification_service
        self.orchestrator = ai_orchestrator

    # ── Main entry point ─────────────────────────────────────────────

    async def execute_run(
        self,
        run_state: WorkflowRunState,
        dag: DAG,
    ) -> WorkflowRunState:
        """
        Execute all steps in topological order.
        Persists state after every step.
        """
        run_state.status = WorkflowRunStatus.running
        run_state.started_at = datetime.now(UTC)
        await self._persist_run(run_state)

        try:
            order = dag.topological_sort()
        except ValueError as exc:
            run_state.status = WorkflowRunStatus.failed
            run_state.error = str(exc)
            run_state.completed_at = datetime.now(UTC)
            await self._persist_run(run_state)
            return run_state

        for step_id in order:
            step = dag.get_step(step_id)
            if step is None:
                continue

            # Skip if already completed (resume support)
            existing = run_state.get_step_state(step_id)
            if existing and existing.is_terminal():
                continue

            # Evaluate incoming edge conditions — skip if all conditions fail
            if not self._should_execute_step(dag, step_id, run_state):
                state = StepRunState(
                    step_id=step_id,
                    step_type=step.type,
                    status=StepRunStatus.skipped,
                )
                run_state.set_step_state(state)
                await self._persist_step(run_state.run_id, state)
                continue

            step_state = await self._execute_step_with_retry(
                step=step,
                run_state=run_state,
                dag=dag,
            )
            run_state.set_step_state(step_state)
            await self._persist_step(run_state.run_id, step_state)

            if step_state.status == StepRunStatus.awaiting_approval:
                # Pause execution; will be resumed via approve endpoint
                run_state.status = WorkflowRunStatus.running
                await self._persist_run(run_state)
                raise ApprovalRequired(
                    step_id=step_id,
                    run_id=run_state.run_id,
                    approval_token=step_state.approval_token or "",
                )

            if step_state.status == StepRunStatus.failed:
                run_state.status = WorkflowRunStatus.failed
                run_state.error = step_state.error
                run_state.completed_at = datetime.now(UTC)
                await self._persist_run(run_state)
                return run_state

        run_state.status = WorkflowRunStatus.completed
        run_state.completed_at = datetime.now(UTC)
        await self._persist_run(run_state)
        return run_state

    # ── Step execution with retry ────────────────────────────────────

    async def _execute_step_with_retry(
        self,
        step: Step,
        run_state: WorkflowRunState,
        dag: DAG,
    ) -> StepRunState:
        state = StepRunState(
            step_id=step.id,
            step_type=step.type,
            status=StepRunStatus.running,
            started_at=datetime.now(UTC),
        )
        run_state.set_step_state(state)

        for attempt in range(step.max_retries + 1):
            try:
                output = await asyncio.wait_for(
                    self._dispatch_step(step, run_state),
                    timeout=step.timeout_seconds,
                )
                state.status = StepRunStatus.completed
                state.output = output or {}
                state.completed_at = datetime.now(UTC)
                return state

            except ApprovalRequired:
                raise  # propagate up unchanged

            except asyncio.TimeoutError:
                error = f"Step '{step.id}' timed out after {step.timeout_seconds}s"
                logger.warning(error)
                if attempt < step.max_retries:
                    state.status = StepRunStatus.retrying
                    state.retry_count = attempt + 1
                    backoff = 0.5 * (2 ** attempt)
                    await asyncio.sleep(backoff)
                    continue
                state.status = StepRunStatus.failed
                state.error = error
                state.completed_at = datetime.now(UTC)
                return state

            except Exception as exc:
                error = str(exc)
                logger.exception("Step '%s' failed on attempt %d", step.id, attempt + 1)
                if attempt < step.max_retries:
                    state.status = StepRunStatus.retrying
                    state.retry_count = attempt + 1
                    backoff = 0.5 * (2 ** attempt)
                    await asyncio.sleep(backoff)
                    continue
                state.status = StepRunStatus.failed
                state.error = error
                state.completed_at = datetime.now(UTC)
                return state

        # Should not be reached
        state.status = StepRunStatus.failed
        state.error = "Max retries exhausted"
        state.completed_at = datetime.now(UTC)
        return state

    # ── Step dispatch by type ────────────────────────────────────────

    async def _dispatch_step(
        self, step: Step, run_state: WorkflowRunState
    ) -> dict[str, Any]:
        handlers = {
            "llm": self._exec_llm,
            "condition": self._exec_condition,
            "api_call": self._exec_api_call,
            "retrieval": self._exec_retrieval,
            "approval": self._exec_approval,
            "transform": self._exec_transform,
            "loop": self._exec_loop,
            "tool": self._exec_tool,
        }
        handler = handlers.get(step.type)
        if handler is None:
            raise ValueError(f"Unknown step type: '{step.type}'")

        ctx = run_state.completed_output()
        return await handler(step, ctx, run_state)

    async def _exec_llm(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        if self.orchestrator is None:
            raise RuntimeError("AI orchestrator not configured")

        from packages.ai_sdk.providers.orchestrator import (
            Orchestrator,
            OrchestratorContext,
        )

        prompt = _render_template(step.config.get("prompt", ""), ctx)
        model = step.config.get("model", "gpt-4o")

        orch_ctx = OrchestratorContext(
            user_message=prompt,
            model=model,
            org_id=run_state.org_id,
            user_id="workflow",
        )
        result = await self.orchestrator.complete(orch_ctx)
        return {"response": result.content, "model": result.model}

    async def _exec_condition(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        expression = step.config.get("expression", "true")
        result = _eval_condition(expression, ctx)
        return {"result": result, "branch": "true" if result else "false"}

    async def _exec_api_call(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        url = _render_template(step.config["url"], ctx)
        method = step.config.get("method", "POST").upper()
        headers = step.config.get("headers", {})
        payload = step.config.get("payload", {})

        # Render templated values in payload
        rendered_payload = {
            k: _render_template(str(v), ctx) if isinstance(v, str) else v
            for k, v in payload.items()
        }

        async with httpx.AsyncClient(timeout=step.timeout_seconds) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=rendered_payload,
            )
        return {
            "status_code": response.status_code,
            "body": _safe_json(response),
        }

    async def _exec_retrieval(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        from packages.rag_pipeline.retriever import Retriever
        from packages.rag_pipeline.embedder import Embedder

        query = _render_template(step.config.get("query", ""), ctx)
        kb_ids = step.config.get("knowledge_base_ids", [])

        retriever = Retriever(db_session=self.db, embedder=Embedder())
        chunks = await retriever.retrieve(
            query=query,
            knowledge_base_ids=kb_ids,
            org_id=run_state.org_id,
            top_k=step.config.get("top_k", 5),
        )
        return {"chunks": chunks}

    async def _exec_approval(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        token = _generate_approval_token(
            run_id=run_state.run_id,
            step_id=step.id,
        )
        step_state = run_state.get_step_state(step.id)
        if step_state:
            step_state.status = StepRunStatus.awaiting_approval
            step_state.approval_token = token

        # Notify approvers
        if self.notifications:
            approvers = step.config.get("approvers", [])
            for approver_email in approvers:
                await self.notifications.send_approval_email(
                    to_email=approver_email,
                    run_id=run_state.run_id,
                    step_id=step.id,
                    token=token,
                    context=ctx,
                )

        raise ApprovalRequired(
            step_id=step.id,
            run_id=run_state.run_id,
            approval_token=token,
        )

    async def _exec_transform(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        """Apply a simple key-mapping transformation to the context."""
        mapping = step.config.get("mapping", {})
        result = {}
        for output_key, template in mapping.items():
            result[output_key] = _render_template(str(template), ctx)
        return result

    async def _exec_loop(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        """Iterate over a list and execute a sub-DAG for each item."""
        items_path = step.config.get("items", "")
        items = _resolve_path(items_path, ctx)
        if not isinstance(items, list):
            raise ValueError(f"Loop 'items' must resolve to a list, got: {type(items)}")

        results = []
        sub_definition = step.config.get("sub_workflow", {})
        for i, item in enumerate(items):
            loop_ctx = {**ctx, "loop_item": item, "loop_index": i}
            if sub_definition:
                sub_dag = DAG.from_definition(
                    workflow_id=f"{run_state.workflow_id}_loop_{step.id}",
                    definition=sub_definition,
                )
                sub_run = WorkflowRunState(
                    run_id=str(uuid.uuid4()),
                    workflow_id=run_state.workflow_id,
                    workflow_version=run_state.workflow_version,
                    org_id=run_state.org_id,
                    trigger_type="loop",
                    context=loop_ctx,
                )
                sub_executor = WorkflowExecutor(
                    db_session=self.db,
                    notification_service=self.notifications,
                    ai_orchestrator=self.orchestrator,
                )
                await sub_executor.execute_run(sub_run, sub_dag)
                results.append(sub_run.completed_output())
            else:
                results.append({"item": item, "index": i})

        return {"results": results, "count": len(results)}

    async def _exec_tool(
        self, step: Step, ctx: dict, run_state: WorkflowRunState
    ) -> dict:
        from packages.tool_registry.executor import ToolExecutor

        tool_name = step.config["tool_name"]
        raw_arguments = step.config.get("arguments", {})
        arguments = {
            k: _render_template(str(v), ctx) if isinstance(v, str) else v
            for k, v in raw_arguments.items()
        }

        executor = ToolExecutor(db_session=self.db)
        result = await executor.execute(
            tool_name=tool_name,
            arguments=arguments,
            user_id="workflow",
            org_id=run_state.org_id,
            user_role="admin",  # workflows run with elevated permissions
        )
        return result

    # ── Edge condition evaluation ────────────────────────────────────

    def _should_execute_step(
        self,
        dag: DAG,
        step_id: str,
        run_state: WorkflowRunState,
    ) -> bool:
        """
        Returns True if at least one incoming edge condition is satisfied
        (or there are no incoming edges).
        """
        incoming = dag.predecessors(step_id)
        if not incoming:
            return True

        edges = [e for e in dag.edges if e.to_step == step_id]
        if not edges:
            return True

        ctx = run_state.completed_output()
        for edge in edges:
            if edge.condition is None:
                return True
            try:
                if _eval_condition(edge.condition, ctx):
                    return True
            except Exception:
                pass

        return False

    # ── Persistence ───────────────────────────────────────────────────

    async def _persist_run(self, run_state: WorkflowRunState) -> None:
        try:
            from sqlalchemy import text as sa_text
            import json

            await self.db.execute(
                sa_text(
                    """
                    UPDATE workflow_runs SET
                        status = :status,
                        error = :error,
                        context = :context::jsonb,
                        started_at = :started_at,
                        completed_at = :completed_at
                    WHERE id = :run_id
                    """
                ),
                {
                    "run_id": run_state.run_id,
                    "status": run_state.status.value,
                    "error": run_state.error,
                    "context": json.dumps(run_state.context),
                    "started_at": run_state.started_at,
                    "completed_at": run_state.completed_at,
                },
            )
            await self.db.commit()
        except Exception as exc:
            logger.warning("Failed to persist run state: %s", exc)

    async def _persist_step(
        self, run_id: str, step_state: StepRunState
    ) -> None:
        try:
            from sqlalchemy import text as sa_text
            import json

            await self.db.execute(
                sa_text(
                    """
                    INSERT INTO workflow_step_runs
                        (id, run_id, step_id, status, input, output,
                         started_at, completed_at, retry_count)
                    VALUES
                        (:id, :run_id, :step_id, :status, :input::jsonb,
                         :output::jsonb, :started_at, :completed_at, :retry_count)
                    ON CONFLICT (run_id, step_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        output = EXCLUDED.output,
                        completed_at = EXCLUDED.completed_at,
                        retry_count = EXCLUDED.retry_count
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "run_id": run_id,
                    "step_id": step_state.step_id,
                    "status": step_state.status.value,
                    "input": json.dumps(step_state.input),
                    "output": json.dumps(step_state.output),
                    "started_at": step_state.started_at,
                    "completed_at": step_state.completed_at,
                    "retry_count": step_state.retry_count,
                },
            )
            await self.db.commit()
        except Exception as exc:
            logger.warning("Failed to persist step state: %s", exc)


# ── Helpers ───────────────────────────────────────────────────────────

def _render_template(template: str, ctx: dict) -> str:
    """Replace {{key}} placeholders with values from context."""
    import re

    def replace(match: re.Match) -> str:
        key = match.group(1).strip()
        return str(_resolve_path(key, ctx) or match.group(0))

    return re.sub(r"\{\{(.+?)\}\}", replace, template)


def _resolve_path(path: str, ctx: dict) -> Any:
    """Resolve a dot-notation path against the context dict."""
    keys = path.split(".")
    value: Any = ctx
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
    return value


def _eval_condition(expression: str, ctx: dict) -> bool:
    """
    Evaluate a simple condition expression.
    Supports: == != > < >= <= and or not
    For full JSONLogic support, install the `jsonlogic` package.
    """
    try:
        # First try jsonlogic if available
        import jsonlogic  # type: ignore

        return bool(jsonlogic.jsonLogic(expression, ctx))
    except ImportError:
        pass

    # Fallback: simple Python eval with context
    try:
        import ast as _ast

        safe_ctx = {k: v for k, v in ctx.items() if not k.startswith("_")}
        return bool(eval(expression, {"__builtins__": {}}, safe_ctx))
    except Exception:
        return False


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except Exception:
        return {"text": response.text[:2000]}


def _generate_approval_token(run_id: str, step_id: str) -> str:
    import os
    import hmac
    import hashlib
    import base64
    import json
    import time

    payload = json.dumps({
        "run_id": run_id,
        "step_id": step_id,
        "exp": int(time.time()) + 86400,  # 24h
    })
    secret = os.getenv("JWT_SECRET", "change-me").encode()
    signature = hmac.new(secret, payload.encode(), hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(
        payload.encode() + b"." + signature
    ).decode()
    return token