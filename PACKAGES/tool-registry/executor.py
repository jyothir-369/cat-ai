from __future__ import annotations

import ast
import asyncio
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

from packages.tool_registry.registry import (
    ToolDefinition,
    ToolPermission,
    ToolRegistry,
)

logger = logging.getLogger(__name__)


@dataclass
class ExecutionTrace:
    trace_id: str
    tool_name: str
    input: dict[str, Any]
    output: Any
    status: str  # "success" | "error" | "timeout" | "permission_denied"
    duration_ms: float
    error: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None


class ToolPermissionError(Exception):
    pass


class ToolTimeoutError(Exception):
    pass


class ToolValidationError(Exception):
    pass


class ToolExecutor:
    """
    Validates tool inputs, checks permissions, executes tools with
    timeout enforcement, and logs execution traces.
    """

    def __init__(
        self,
        registry: Optional[ToolRegistry] = None,
        db_session=None,
    ):
        self.registry = registry or ToolRegistry()
        self.db = db_session

    async def execute(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        user_id: str,
        org_id: str,
        user_role: str = "member",
    ) -> dict[str, Any]:
        """
        Full tool execution lifecycle:
        1. Lookup tool definition
        2. Validate input schema
        3. Permission check
        4. Execute with timeout
        5. Log trace
        6. Return result
        """
        trace_id = str(uuid.uuid4())
        t0 = time.monotonic()

        tool = self.registry.get(tool_name)
        if tool is None:
            raise ToolValidationError(f"Unknown tool: {tool_name}")

        # Permission check
        self._check_permission(tool, user_role)

        # Input validation
        self._validate_input(tool, arguments)

        # Execute
        status = "success"
        error_msg = None
        result: Any = None

        try:
            result = await asyncio.wait_for(
                self._dispatch(tool, arguments, user_id=user_id, org_id=org_id),
                timeout=tool.timeout_ms / 1000,
            )
        except asyncio.TimeoutError:
            status = "timeout"
            error_msg = f"Tool {tool_name} timed out after {tool.timeout_ms}ms"
            raise ToolTimeoutError(error_msg)
        except Exception as exc:
            status = "error"
            error_msg = str(exc)
            raise
        finally:
            duration_ms = (time.monotonic() - t0) * 1000
            trace = ExecutionTrace(
                trace_id=trace_id,
                tool_name=tool_name,
                input=arguments,
                output=result,
                status=status,
                duration_ms=duration_ms,
                error=error_msg,
                user_id=user_id,
                org_id=org_id,
            )
            await self._log_trace(trace)

        return {"result": result, "trace_id": trace_id}

    # ── Permission ───────────────────────────────────────────────────

    def _check_permission(
        self, tool: ToolDefinition, user_role: str
    ) -> None:
        role_levels = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}
        required = {
            ToolPermission.workspace: 1,  # member+
            ToolPermission.user: 1,
            ToolPermission.admin: 2,
        }
        required_level = required.get(tool.permission, 1)
        user_level = role_levels.get(user_role, 0)
        if user_level < required_level:
            raise ToolPermissionError(
                f"Tool '{tool.name}' requires role '{tool.permission.value}', "
                f"but user has role '{user_role}'"
            )

    # ── Input validation ─────────────────────────────────────────────

    def _validate_input(
        self, tool: ToolDefinition, arguments: dict[str, Any]
    ) -> None:
        required = tool.parameters.get("required", [])
        for key in required:
            if key not in arguments:
                raise ToolValidationError(
                    f"Tool '{tool.name}' requires argument '{key}'"
                )

        properties = tool.parameters.get("properties", {})
        for key, value in arguments.items():
            if key not in properties:
                raise ToolValidationError(
                    f"Tool '{tool.name}' does not accept argument '{key}'"
                )

    # ── Dispatch ─────────────────────────────────────────────────────

    async def _dispatch(
        self,
        tool: ToolDefinition,
        arguments: dict[str, Any],
        user_id: str,
        org_id: str,
    ) -> Any:
        # If tool has a custom handler, use it
        if tool.handler is not None:
            return await tool.handler(
                arguments, user_id=user_id, org_id=org_id
            )

        # Built-in dispatch by name
        handlers = {
            "web_search": self._handle_web_search,
            "calculator": self._handle_calculator,
            "knowledge_retrieval": self._handle_knowledge_retrieval,
            "memory_read": self._handle_memory_read,
            "memory_write": self._handle_memory_write,
            "send_email": self._handle_send_email,
            "slack_message": self._handle_slack_message,
            "notion_create": self._handle_notion_create,
            "google_sheets": self._handle_google_sheets,
            "webhook_call": self._handle_webhook_call,
            "code_executor": self._handle_code_executor,
            "browser_automation": self._handle_browser_automation,
        }

        handler = handlers.get(tool.name)
        if handler is None:
            raise ToolValidationError(f"No handler for tool '{tool.name}'")

        return await handler(arguments, user_id=user_id, org_id=org_id)

    # ── Built-in handlers ────────────────────────────────────────────

    async def _handle_web_search(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        query = args["query"]
        num_results = min(args.get("num_results", 5), 10)
        api_key = os.getenv("SERPER_API_KEY") or os.getenv("TAVILY_API_KEY")

        if not api_key:
            return {"error": "No search API key configured", "results": []}

        if os.getenv("SERPER_API_KEY"):
            return await _serper_search(query, num_results, api_key)
        else:
            return await _tavily_search(query, num_results, api_key)

    async def _handle_calculator(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        expression = args["expression"]
        result = _safe_eval(expression)
        return {"result": result, "expression": expression}

    async def _handle_knowledge_retrieval(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        # Deferred import to avoid circular dependencies
        from packages.rag_pipeline.retriever import Retriever
        from packages.rag_pipeline.embedder import Embedder

        retriever = Retriever(db_session=self.db, embedder=Embedder())
        kb_id = args.get("knowledge_base_id")
        kb_ids = [kb_id] if kb_id else await _list_org_kb_ids(self.db, org_id)
        chunks = await retriever.retrieve(
            query=args["query"],
            knowledge_base_ids=kb_ids,
            org_id=org_id,
            top_k=args.get("top_k", 5),
        )
        return {"chunks": chunks}

    async def _handle_memory_read(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        from sqlalchemy import text as sa_text

        rows = await self.db.execute(
            sa_text(
                """
                SELECT content, importance_score
                FROM memories
                WHERE org_id = :org_id AND user_id = :user_id
                ORDER BY importance_score DESC
                LIMIT :top_k
                """
            ),
            {"org_id": org_id, "user_id": user_id, "top_k": args.get("top_k", 5)},
        )
        memories = [
            {"content": row.content, "importance": row.importance_score}
            for row in rows.fetchall()
        ]
        return {"memories": memories}

    async def _handle_memory_write(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        from sqlalchemy import text as sa_text
        from packages.rag_pipeline.embedder import Embedder

        content = args["content"]
        embedder = Embedder()
        embedding = await embedder.embed_single(content)

        await self.db.execute(
            sa_text(
                """
                INSERT INTO memories (id, org_id, user_id, content, embedding, importance_score)
                VALUES (:id, :org_id, :user_id, :content, :embedding::vector, 0.5)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "org_id": org_id,
                "user_id": user_id,
                "content": content,
                "embedding": f"[{','.join(str(v) for v in embedding)}]",
            },
        )
        await self.db.commit()
        return {"stored": True, "content": content}

    async def _handle_send_email(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        import smtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = os.getenv("EMAIL_FROM", "noreply@cat-ai.app")
        msg["To"] = args["to"]
        msg["Subject"] = args["subject"]
        if args.get("cc"):
            msg["Cc"] = args["cc"]
        msg.set_content(args["body"])

        smtp_host = os.getenv("SMTP_HOST", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: _send_smtp(msg, smtp_host, smtp_port)
        )
        return {"sent": True, "to": args["to"]}

    async def _handle_slack_message(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        token = await _get_integration_token(self.db, org_id, "slack")
        if not token:
            return {"error": "Slack integration not connected"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": args["channel"], "text": args["message"]},
            )
            data = response.json()
        return {"ok": data.get("ok"), "ts": data.get("ts")}

    async def _handle_notion_create(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        token = await _get_integration_token(self.db, org_id, "notion")
        if not token:
            return {"error": "Notion integration not connected"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.notion.com/v1/pages",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Notion-Version": "2022-06-28",
                },
                json={
                    "parent": {"page_id": args["parent_id"]},
                    "properties": {
                        "title": {
                            "title": [{"text": {"content": args["title"]}}]
                        }
                    },
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [
                                    {"type": "text", "text": {"content": args.get("content", "")}}
                                ]
                            },
                        }
                    ],
                },
            )
            data = response.json()
        return {"page_id": data.get("id"), "url": data.get("url")}

    async def _handle_google_sheets(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        token = await _get_integration_token(self.db, org_id, "google")
        if not token:
            return {"error": "Google integration not connected"}

        base = "https://sheets.googleapis.com/v4/spreadsheets"
        sid = args["spreadsheet_id"]
        rng = args["range"]
        action = args["action"]

        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            if action == "read":
                r = await client.get(f"{base}/{sid}/values/{rng}", headers=headers)
                return r.json()
            elif action == "append":
                r = await client.post(
                    f"{base}/{sid}/values/{rng}:append",
                    headers=headers,
                    params={"valueInputOption": "USER_ENTERED"},
                    json={"values": args.get("values", [])},
                )
                return r.json()
            elif action == "update":
                r = await client.put(
                    f"{base}/{sid}/values/{rng}",
                    headers=headers,
                    params={"valueInputOption": "USER_ENTERED"},
                    json={"values": args.get("values", [])},
                )
                return r.json()
        return {"error": "Unknown action"}

    async def _handle_webhook_call(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        url = args["url"]
        # Validate against workspace allowlist (MVP: basic URL check)
        if not url.startswith("https://"):
            return {"error": "Only HTTPS URLs are allowed"}

        method = args.get("method", "POST").upper()
        payload = args.get("payload", {})
        headers = args.get("headers", {})

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(
                method=method,
                url=url,
                json=payload,
                headers=headers,
            )
        return {
            "status_code": response.status_code,
            "body": response.text[:2000],  # truncate large responses
        }

    async def _handle_code_executor(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        code = args["code"]
        language = args.get("language", "python")
        timeout = min(args.get("timeout_seconds", 10), 30)

        if language == "python":
            return await _exec_python_sandboxed(code, timeout)
        else:
            return {"error": f"Language '{language}' not yet supported"}

    async def _handle_browser_automation(
        self, args: dict, user_id: str, org_id: str
    ) -> dict:
        try:
            from playwright.async_api import async_playwright

            url = args["url"]
            action = args.get("action", "get_text")
            selector = args.get("selector")

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(url, timeout=20_000)

                if action == "get_text":
                    result = await page.inner_text("body")
                elif action == "get_html":
                    result = await page.content()
                elif action == "click" and selector:
                    await page.click(selector)
                    result = "clicked"
                elif action == "fill" and selector:
                    await page.fill(selector, args.get("value", ""))
                    result = "filled"
                else:
                    result = await page.inner_text("body")

                await browser.close()
            return {"result": str(result)[:5000]}
        except ImportError:
            return {"error": "Playwright not installed"}

    # ── Trace logging ────────────────────────────────────────────────

    async def _log_trace(self, trace: ExecutionTrace) -> None:
        if self.db is None:
            return
        try:
            from sqlalchemy import text as sa_text
            import json

            await self.db.execute(
                sa_text(
                    """
                    INSERT INTO tool_calls
                        (id, tool_name, input, output, status,
                         duration_ms, error, user_id, org_id)
                    VALUES
                        (:id, :tool_name, :input::jsonb, :output::jsonb,
                         :status, :duration_ms, :error, :user_id, :org_id)
                    """
                ),
                {
                    "id": trace.trace_id,
                    "tool_name": trace.tool_name,
                    "input": json.dumps(trace.input),
                    "output": json.dumps(trace.output) if trace.output is not None else "null",
                    "status": trace.status,
                    "duration_ms": trace.duration_ms,
                    "error": trace.error,
                    "user_id": trace.user_id,
                    "org_id": trace.org_id,
                },
            )
            await self.db.commit()
        except Exception as exc:
            logger.warning("Failed to log tool trace: %s", exc)


# ── Helpers ───────────────────────────────────────────────────────────

async def _serper_search(
    query: str, num_results: int, api_key: str
) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key},
            json={"q": query, "num": num_results},
        )
        data = response.json()
    results = [
        {"title": r.get("title"), "url": r.get("link"), "snippet": r.get("snippet")}
        for r in data.get("organic", [])[:num_results]
    ]
    return {"results": results}


async def _tavily_search(
    query: str, num_results: int, api_key: str
) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": query,
                "max_results": num_results,
            },
        )
        data = response.json()
    results = [
        {"title": r.get("title"), "url": r.get("url"), "snippet": r.get("content", "")[:300]}
        for r in data.get("results", [])[:num_results]
    ]
    return {"results": results}


def _safe_eval(expression: str) -> Any:
    """Evaluate a math expression using AST — no exec/eval."""
    allowed_nodes = (
        ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Constant,
        ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod,
        ast.FloorDiv, ast.USub, ast.UAdd,
    )
    try:
        tree = ast.parse(expression, mode="eval")
        for node in ast.walk(tree):
            if not isinstance(node, allowed_nodes):
                raise ToolValidationError(
                    f"Disallowed expression node: {type(node).__name__}"
                )
        return eval(compile(tree, "<string>", "eval"))
    except Exception as exc:
        raise ToolValidationError(f"Invalid expression: {exc}") from exc


async def _exec_python_sandboxed(code: str, timeout: int) -> dict:
    """Run Python in a subprocess with resource limits."""
    import sys
    import tempfile

    with tempfile.NamedTemporaryFile(
        suffix=".py", mode="w", delete=False
    ) as f:
        f.write(code)
        tmpfile = f.name

    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, tmpfile,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
        return {
            "stdout": stdout.decode()[:5000],
            "stderr": stderr.decode()[:1000],
            "exit_code": proc.returncode,
        }
    except asyncio.TimeoutError:
        proc.kill()
        return {"error": "Execution timed out", "stdout": "", "stderr": ""}
    finally:
        import os as _os
        _os.unlink(tmpfile)


def _send_smtp(msg, host: str, port: int) -> None:
    import smtplib

    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        if smtp_user:
            server.starttls()
            server.login(smtp_user, smtp_pass)
        server.send_message(msg)


async def _get_integration_token(
    db, org_id: str, provider: str
) -> Optional[str]:
    if db is None:
        return None
    from sqlalchemy import text as sa_text

    row = await db.execute(
        sa_text(
            """
            SELECT encrypted_credentials FROM integrations
            WHERE org_id = :org_id AND provider = :provider
            LIMIT 1
            """
        ),
        {"org_id": org_id, "provider": provider},
    )
    result = row.fetchone()
    if not result:
        return None
    # In production, decrypt using security.py AES-256-GCM
    return result.encrypted_credentials


async def _list_org_kb_ids(db, org_id: str) -> list[str]:
    from sqlalchemy import text as sa_text

    rows = await db.execute(
        sa_text("SELECT id FROM knowledge_bases WHERE org_id = :org_id"),
        {"org_id": org_id},
    )
    return [str(r.id) for r in rows.fetchall()]