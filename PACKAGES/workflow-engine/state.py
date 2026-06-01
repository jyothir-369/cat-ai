from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class WorkflowRunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class StepRunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"
    awaiting_approval = "awaiting_approval"
    approved = "approved"
    rejected = "rejected"
    retrying = "retrying"


@dataclass
class StepRunState:
    step_id: str
    step_type: str
    status: StepRunStatus = StepRunStatus.pending
    input: dict[str, Any] = field(default_factory=dict)
    output: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    approval_token: Optional[str] = None
    approval_comment: Optional[str] = None

    def is_terminal(self) -> bool:
        return self.status in (
            StepRunStatus.completed,
            StepRunStatus.failed,
            StepRunStatus.skipped,
            StepRunStatus.rejected,
        )

    def duration_ms(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds() * 1000
        return None


@dataclass
class WorkflowRunState:
    run_id: str
    workflow_id: str
    workflow_version: int
    org_id: str
    trigger_type: str  # manual | webhook | cron | event
    status: WorkflowRunStatus = WorkflowRunStatus.pending
    context: dict[str, Any] = field(default_factory=dict)  # trigger payload + step outputs
    step_states: dict[str, StepRunState] = field(default_factory=dict)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def get_step_state(self, step_id: str) -> Optional[StepRunState]:
        return self.step_states.get(step_id)

    def set_step_state(self, state: StepRunState) -> None:
        self.step_states[state.step_id] = state

    def is_terminal(self) -> bool:
        return self.status in (
            WorkflowRunStatus.completed,
            WorkflowRunStatus.failed,
            WorkflowRunStatus.cancelled,
        )

    def all_steps_done(self, step_ids: list[str]) -> bool:
        return all(
            self.step_states.get(sid, StepRunState(sid, "")).is_terminal()
            for sid in step_ids
        )

    def completed_output(self) -> dict[str, Any]:
        """Collect all step outputs into the run context."""
        result = dict(self.context)
        for step_id, state in self.step_states.items():
            result[f"steps.{step_id}"] = state.output
        return result