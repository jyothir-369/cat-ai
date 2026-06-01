from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class ToolPermission(str, Enum):
    workspace = "workspace"  # any workspace member
    user = "user"            # only the individual user
    admin = "admin"          # workspace admin+


@dataclass
class RetryPolicy:
    max_retries: int = 2
    backoff_base_ms: int = 500


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    permission: ToolPermission = ToolPermission.workspace
    sandbox: bool = False
    timeout_ms: int = 10_000
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    handler: Optional[Callable] = field(default=None, repr=False)


class ToolRegistry:
    """Central registry for all available tools."""

    _instance: Optional["ToolRegistry"] = None
    _tools: dict[str, ToolDefinition] = {}

    def __new__(cls) -> "ToolRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools = {}
            cls._instance._register_builtins()
        return cls._instance

    def register(self, tool: ToolDefinition) -> None:
        if tool.name in self._tools:
            logger.warning("Tool %s is being re-registered", tool.name)
        self._tools[tool.name] = tool
        logger.debug("Registered tool: %s", tool.name)

    def get(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tools(
        self,
        permission: Optional[ToolPermission] = None,
    ) -> list[ToolDefinition]:
        tools = list(self._tools.values())
        if permission is not None:
            tools = [t for t in tools if t.permission == permission]
        return tools

    def to_openai_functions(
        self, names: Optional[list[str]] = None
    ) -> list[dict[str, Any]]:
        """Return tool definitions in OpenAI function-calling format."""
        tools = (
            [self._tools[n] for n in names if n in self._tools]
            if names
            else list(self._tools.values())
        )
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in tools
        ]

    def _register_builtins(self) -> None:
        builtins = _build_builtin_tools()
        for tool in builtins:
            self._tools[tool.name] = tool


def _build_builtin_tools() -> list[ToolDefinition]:
    return [
        ToolDefinition(
            name="web_search",
            description=(
                "Search the web for real-time information. "
                "Use when the user asks about recent events, facts, or anything "
                "that requires up-to-date information."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (1-10)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
            permission=ToolPermission.workspace,
            timeout_ms=15_000,
        ),
        ToolDefinition(
            name="calculator",
            description=(
                "Evaluate mathematical expressions accurately. "
                "Use for arithmetic, algebra, and numeric calculations."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Mathematical expression to evaluate, e.g. '2 + 2 * 10'",
                    }
                },
                "required": ["expression"],
            },
            permission=ToolPermission.workspace,
            sandbox=True,
            timeout_ms=5_000,
        ),
        ToolDefinition(
            name="knowledge_retrieval",
            description=(
                "Query the workspace knowledge base for relevant information. "
                "Use when answering questions that may be covered by uploaded documents."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    },
                    "knowledge_base_id": {
                        "type": "string",
                        "description": "Specific knowledge base ID to query (optional)",
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of chunks to retrieve",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
            permission=ToolPermission.workspace,
            timeout_ms=10_000,
        ),
        ToolDefinition(
            name="memory_read",
            description="Read stored long-term memories for the current user.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Query to find relevant memories",
                    },
                    "top_k": {
                        "type": "integer",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
            permission=ToolPermission.user,
            timeout_ms=5_000,
        ),
        ToolDefinition(
            name="memory_write",
            description="Store a new long-term memory for the current user.",
            parameters={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The fact or preference to remember",
                    }
                },
                "required": ["content"],
            },
            permission=ToolPermission.user,
            timeout_ms=5_000,
        ),
        ToolDefinition(
            name="send_email",
            description="Send an email via Gmail OAuth integration or SMTP.",
            parameters={
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email"},
                    "subject": {"type": "string"},
                    "body": {"type": "string", "description": "Email body (plain text or HTML)"},
                    "cc": {"type": "string", "description": "CC recipients (comma-separated)"},
                },
                "required": ["to", "subject", "body"],
            },
            permission=ToolPermission.admin,
            timeout_ms=15_000,
        ),
        ToolDefinition(
            name="slack_message",
            description="Post a message to a Slack channel via OAuth bot token.",
            parameters={
                "type": "object",
                "properties": {
                    "channel": {"type": "string", "description": "Channel name or ID"},
                    "message": {"type": "string", "description": "Message text"},
                },
                "required": ["channel", "message"],
            },
            permission=ToolPermission.admin,
            timeout_ms=10_000,
        ),
        ToolDefinition(
            name="notion_create",
            description="Create a new Notion page via the Notion API integration.",
            parameters={
                "type": "object",
                "properties": {
                    "parent_id": {"type": "string", "description": "Parent page or database ID"},
                    "title": {"type": "string"},
                    "content": {"type": "string", "description": "Page content in markdown"},
                },
                "required": ["parent_id", "title"],
            },
            permission=ToolPermission.admin,
            timeout_ms=15_000,
        ),
        ToolDefinition(
            name="google_sheets",
            description="Read or write data to a Google Sheet via Sheets API.",
            parameters={
                "type": "object",
                "properties": {
                    "spreadsheet_id": {"type": "string"},
                    "range": {"type": "string", "description": "A1 notation range, e.g. 'Sheet1!A1:D10'"},
                    "action": {
                        "type": "string",
                        "enum": ["read", "append", "update"],
                    },
                    "values": {
                        "type": "array",
                        "description": "2D array of values (required for append/update)",
                        "items": {"type": "array"},
                    },
                },
                "required": ["spreadsheet_id", "range", "action"],
            },
            permission=ToolPermission.admin,
            timeout_ms=15_000,
        ),
        ToolDefinition(
            name="webhook_call",
            description="Make an outbound HTTP request to a configured webhook URL.",
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Target URL (must be on workspace allowlist)"},
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
                        "default": "POST",
                    },
                    "payload": {"type": "object", "description": "JSON payload"},
                    "headers": {"type": "object", "description": "Additional HTTP headers"},
                },
                "required": ["url"],
            },
            permission=ToolPermission.admin,
            timeout_ms=20_000,
        ),
        ToolDefinition(
            name="code_executor",
            description=(
                "Execute Python or JavaScript code in an isolated sandbox "
                "and return stdout/stderr. No network access inside sandbox."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "enum": ["python", "javascript"],
                        "default": "python",
                    },
                    "code": {"type": "string", "description": "Code to execute"},
                    "timeout_seconds": {
                        "type": "integer",
                        "description": "Execution timeout in seconds (max 30)",
                        "default": 10,
                    },
                },
                "required": ["code"],
            },
            permission=ToolPermission.admin,
            sandbox=True,
            timeout_ms=35_000,
        ),
        ToolDefinition(
            name="browser_automation",
            description=(
                "Use a headless browser (Playwright) to scrape or interact with "
                "web pages. Returns page text or specific element content."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to navigate to"},
                    "action": {
                        "type": "string",
                        "enum": ["get_text", "get_html", "screenshot", "click", "fill"],
                        "default": "get_text",
                    },
                    "selector": {
                        "type": "string",
                        "description": "CSS selector for targeted actions",
                    },
                    "value": {
                        "type": "string",
                        "description": "Value to fill into a form field",
                    },
                },
                "required": ["url"],
            },
            permission=ToolPermission.admin,
            sandbox=True,
            timeout_ms=30_000,
        ),
    ]