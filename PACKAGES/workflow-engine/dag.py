from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Step:
    id: str
    type: str  # llm | condition | api_call | retrieval | approval | transform | loop | tool
    config: dict[str, Any] = field(default_factory=dict)
    inputs: dict[str, Any] = field(default_factory=dict)
    outputs: dict[str, Any] = field(default_factory=dict)
    max_retries: int = 3
    timeout_seconds: int = 30


@dataclass
class Edge:
    from_step: str
    to_step: str
    condition: Optional[str] = None  # JSONLogic expression; None = always take this edge


@dataclass
class DAG:
    workflow_id: str
    steps: list[Step]
    edges: list[Edge]

    # Derived
    _adjacency: dict[str, list[str]] = field(default_factory=dict, init=False, repr=False)
    _in_degree: dict[str, int] = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self) -> None:
        self._build_graph()

    def _build_graph(self) -> None:
        step_ids = {s.id for s in self.steps}

        self._adjacency = {s.id: [] for s in self.steps}
        self._in_degree = {s.id: 0 for s in self.steps}

        for edge in self.edges:
            if edge.from_step not in step_ids:
                raise ValueError(
                    f"Edge references unknown step '{edge.from_step}'"
                )
            if edge.to_step not in step_ids:
                raise ValueError(
                    f"Edge references unknown step '{edge.to_step}'"
                )
            self._adjacency[edge.from_step].append(edge.to_step)
            self._in_degree[edge.to_step] += 1

    # ── Topological sort (Kahn's algorithm) ─────────────────────────

    def topological_sort(self) -> list[str]:
        """
        Return step IDs in topological execution order.
        Raises ValueError if a cycle is detected.
        """
        in_degree = dict(self._in_degree)
        queue: deque[str] = deque(
            step_id for step_id, degree in in_degree.items() if degree == 0
        )
        order: list[str] = []

        while queue:
            current = queue.popleft()
            order.append(current)
            for neighbour in self._adjacency.get(current, []):
                in_degree[neighbour] -= 1
                if in_degree[neighbour] == 0:
                    queue.append(neighbour)

        if len(order) != len(self.steps):
            visited = set(order)
            cycle_nodes = [s.id for s in self.steps if s.id not in visited]
            raise ValueError(
                f"Cycle detected in workflow '{self.workflow_id}' "
                f"involving steps: {cycle_nodes}"
            )

        return order

    def has_cycle(self) -> bool:
        try:
            self.topological_sort()
            return False
        except ValueError:
            return True

    def get_step(self, step_id: str) -> Optional[Step]:
        for step in self.steps:
            if step.id == step_id:
                return step
        return None

    def successors(self, step_id: str) -> list[str]:
        return list(self._adjacency.get(step_id, []))

    def predecessors(self, step_id: str) -> list[str]:
        return [
            edge.from_step
            for edge in self.edges
            if edge.to_step == step_id
        ]

    def start_steps(self) -> list[str]:
        """Return steps with no incoming edges (DAG entry points)."""
        return [
            step_id
            for step_id, degree in self._in_degree.items()
            if degree == 0
        ]

    def outgoing_edges(self, step_id: str) -> list[Edge]:
        return [e for e in self.edges if e.from_step == step_id]

    # ── Serialisation ────────────────────────────────────────────────

    def to_dict(self) -> dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "steps": [
                {
                    "id": s.id,
                    "type": s.type,
                    "config": s.config,
                    "inputs": s.inputs,
                    "outputs": s.outputs,
                    "max_retries": s.max_retries,
                    "timeout_seconds": s.timeout_seconds,
                }
                for s in self.steps
            ],
            "edges": [
                {
                    "from": e.from_step,
                    "to": e.to_step,
                    "condition": e.condition,
                }
                for e in self.edges
            ],
        }

    @classmethod
    def from_definition(
        cls, workflow_id: str, definition: dict[str, Any]
    ) -> "DAG":
        steps = [
            Step(
                id=s["id"],
                type=s["type"],
                config=s.get("config", {}),
                inputs=s.get("inputs", {}),
                outputs=s.get("outputs", {}),
                max_retries=s.get("max_retries", 3),
                timeout_seconds=s.get("timeout_seconds", 30),
            )
            for s in definition.get("steps", [])
        ]
        edges = [
            Edge(
                from_step=e["from"],
                to_step=e["to"],
                condition=e.get("condition"),
            )
            for e in definition.get("edges", [])
        ]
        return cls(workflow_id=workflow_id, steps=steps, edges=edges)