from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional

from apps.api.ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    MessageRole,
    ProviderMessage,
    TokenChunk,
    ToolDefinition,
)
from apps.api.ai.token_counter import TokenCounter
from apps.api.ai.circuit_breaker import CircuitBreaker

# Token budgets per section (total ~5200 before response)
BUDGET_SYSTEM = 500
BUDGET_MEMORY = 200
BUDGET_RAG = 1500
BUDGET_HISTORY = 2000
BUDGET_TOOLS = 500
BUDGET_USER = 500


@dataclass
class OrchestratorContext:
    user_message: str
    model: str
    org_id: str
    user_id: str
    conversation_id: Optional[str] = None
    system_prompt: Optional[str] = None
    memories: list[str] = field(default_factory=list)
    rag_chunks: list[dict[str, Any]] = field(default_factory=list)
    conversation_history: list[ProviderMessage] = field(default_factory=list)
    tools: list[ToolDefinition] = field(default_factory=list)
    temperature: float = 0.7
    max_tokens: int = 1024


@dataclass
class OrchestratorResult:
    content: str
    model: str
    tokens_in: int
    tokens_out: int
    latency_ms: float
    tool_calls: list[dict[str, Any]] = field(default_factory=list)


class Orchestrator:
    """
    Assembles prompts from multiple context sources with token budgeting
    and delegates to the provider router for model execution.
    """

    def __init__(
        self,
        router: Any,  # providers.router.ProviderRouter
        token_counter: Optional[TokenCounter] = None,
    ):
        self.router = router
        self.token_counter = token_counter or TokenCounter()

    # ── Prompt Assembly ──────────────────────────────────────────────

    def _build_system_message(
        self,
        system_prompt: Optional[str],
        memories: list[str],
        rag_chunks: list[dict[str, Any]],
        model: str,
    ) -> tuple[list[ProviderMessage], int]:
        """
        Assemble the system-level context: system prompt + memory + RAG.
        Returns messages and total tokens consumed.
        """
        parts: list[str] = []
        tokens_used = 0

        # 1. System prompt
        base_system = system_prompt or (
            "You are CAT AI, a helpful AI assistant. "
            "Be concise, accurate, and helpful."
        )
        system_tokens = self.token_counter.count_text(base_system, model)
        if system_tokens <= BUDGET_SYSTEM:
            parts.append(base_system)
            tokens_used += system_tokens
        else:
            truncated = self.token_counter.truncate_text(
                base_system, BUDGET_SYSTEM, model
            )
            parts.append(truncated)
            tokens_used += BUDGET_SYSTEM

        # 2. Long-term memory injection
        if memories:
            memory_lines = []
            memory_tokens = 0
            for mem in memories:
                line = f"- {mem}"
                t = self.token_counter.count_text(line, model)
                if memory_tokens + t > BUDGET_MEMORY:
                    break
                memory_lines.append(line)
                memory_tokens += t
            if memory_lines:
                parts.append(
                    "\n\n## Relevant Memory\n" + "\n".join(memory_lines)
                )
                tokens_used += memory_tokens

        # 3. RAG context injection
        if rag_chunks:
            rag_lines = []
            rag_tokens = 0
            for chunk in rag_chunks:
                source = chunk.get("source", "unknown")
                content = chunk.get("content", "")
                entry = f"[Source: {source}]\n{content}"
                t = self.token_counter.count_text(entry, model)
                if rag_tokens + t > BUDGET_RAG:
                    break
                rag_lines.append(entry)
                rag_tokens += t
            if rag_lines:
                parts.append(
                    "\n\n## Knowledge Base Context\n"
                    + "\n\n---\n\n".join(rag_lines)
                    + "\n\nCite sources when using information above."
                )
                tokens_used += rag_tokens

        system_content = "\n".join(parts)
        messages = [ProviderMessage(role=MessageRole.system, content=system_content)]
        return messages, tokens_used

    def _trim_history(
        self,
        history: list[ProviderMessage],
        model: str,
        budget: int = BUDGET_HISTORY,
    ) -> list[ProviderMessage]:
        """
        Trim conversation history to fit within the token budget.
        Always keeps the most recent messages; drops oldest first.
        """
        if not history:
            return []

        trimmed: list[ProviderMessage] = []
        tokens_used = 0

        for msg in reversed(history):
            t = self.token_counter.count_text(msg.content, model)
            if tokens_used + t > budget:
                break
            trimmed.insert(0, msg)
            tokens_used += t

        return trimmed

    def assemble_messages(self, ctx: OrchestratorContext) -> list[ProviderMessage]:
        """
        Full 6-stage prompt assembly:
        system → memory → RAG → history → tools (injected via API) → user message
        """
        messages: list[ProviderMessage] = []

        # Stages 1-3: system + memory + RAG (all in system message)
        system_messages, _ = self._build_system_message(
            system_prompt=ctx.system_prompt,
            memories=ctx.memories,
            rag_chunks=ctx.rag_chunks,
            model=ctx.model,
        )
        messages.extend(system_messages)

        # Stage 4: trimmed conversation history
        trimmed_history = self._trim_history(ctx.conversation_history, ctx.model)
        messages.extend(trimmed_history)

        # Stage 6: user message (always preserved)
        user_tokens = self.token_counter.count_text(ctx.user_message, ctx.model)
        user_content = ctx.user_message
        if user_tokens > BUDGET_USER:
            user_content = self.token_counter.truncate_text(
                ctx.user_message, BUDGET_USER, ctx.model
            )

        messages.append(ProviderMessage(role=MessageRole.user, content=user_content))
        return messages

    # ── Completion Methods ───────────────────────────────────────────

    async def complete(self, ctx: OrchestratorContext) -> OrchestratorResult:
        """Non-streaming chat completion with full prompt assembly."""
        t0 = time.monotonic()
        messages = self.assemble_messages(ctx)

        request = ChatRequest(
            messages=messages,
            model=ctx.model,
            max_tokens=ctx.max_tokens,
            temperature=ctx.temperature,
            tools=ctx.tools,
            user_id=ctx.user_id,
            org_id=ctx.org_id,
        )

        response = await self.router.complete_with_fallback(request)
        latency_ms = (time.monotonic() - t0) * 1000

        return OrchestratorResult(
            content=response.content,
            model=response.model,
            tokens_in=response.tokens_in,
            tokens_out=response.tokens_out,
            latency_ms=latency_ms,
            tool_calls=[tc.model_dump() for tc in response.tool_calls],
        )

    async def stream(
        self, ctx: OrchestratorContext
    ) -> AsyncIterator[TokenChunk]:
        """Streaming chat completion with full prompt assembly."""
        messages = self.assemble_messages(ctx)

        request = ChatRequest(
            messages=messages,
            model=ctx.model,
            max_tokens=ctx.max_tokens,
            temperature=ctx.temperature,
            tools=ctx.tools,
            stream=True,
            user_id=ctx.user_id,
            org_id=ctx.org_id,
        )

        async for chunk in self.router.stream_with_fallback(request):
            yield chunk

    # ── Context Injection Hooks ──────────────────────────────────────

    async def inject_memory(
        self,
        ctx: OrchestratorContext,
        memory_retriever: Any,
    ) -> None:
        """Retrieve and inject relevant memories into the context."""
        if not ctx.user_message:
            return
        memories = await memory_retriever.retrieve(
            query=ctx.user_message,
            org_id=ctx.org_id,
            user_id=ctx.user_id,
            top_k=5,
        )
        ctx.memories = [m["content"] for m in memories]

    async def inject_rag(
        self,
        ctx: OrchestratorContext,
        rag_retriever: Any,
        knowledge_base_ids: list[str],
    ) -> None:
        """Retrieve and inject RAG chunks into the context."""
        if not knowledge_base_ids or not ctx.user_message:
            return
        chunks = await rag_retriever.retrieve(
            query=ctx.user_message,
            knowledge_base_ids=knowledge_base_ids,
            org_id=ctx.org_id,
            top_k=5,
        )
        ctx.rag_chunks = chunks