from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    EmbeddingResponse,
    ProviderHealth,
    ProviderStatus,
    ProviderMessage,
    TokenChunk,
    ToolCallResponse,
    ToolDefinition,
)
from core.config import settings
from core.exceptions import ProviderError

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------

_GROQ_DEFAULT_URL = "https://api.groq.com/openai/v1"


class GroqProvider(BaseProvider):
    name = "groq"

    def __init__(self) -> None:
        self._base_url = (
            getattr(settings, "groq_api_url", None)
            or getattr(settings, "GROQ_API_URL", None)
            or _GROQ_DEFAULT_URL
        ).rstrip("/")

        self._api_key = (
            getattr(settings, "groq_api_key", None)
            or getattr(settings, "GROQ_API_KEY", None)
            or ""
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _serialize_messages(
        self,
        messages: list[ProviderMessage],
    ) -> list[dict]:
        return [
            {
                "role": (
                    message.role.value
                    if hasattr(message.role, "value")
                    else str(message.role)
                ),
                "content": message.content,
            }
            for message in messages
        ]

    # ------------------------------------------------------------------
    # Chat Completion
    # ------------------------------------------------------------------

    async def chat_completion(
        self,
        request: ChatRequest,
    ) -> ChatResponse:

        if not self._api_key:
            raise ProviderError(
                "GROQ_API_KEY not configured",
                provider=self.name,
            )

        body = {
            "model": request.model,
            "messages": self._serialize_messages(request.messages),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=self._headers(),
                    json=body,
                )

                response.raise_for_status()
                data = response.json()

        except Exception as exc:
            raise self._build_provider_error(exc)

        choice = data["choices"][0]
        usage = data.get("usage", {})

        return ChatResponse(
            content=choice["message"]["content"] or "",
            model=request.model,
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
            finish_reason=choice.get("finish_reason"),
        )

    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    async def stream_completion(
        self,
        request: ChatRequest,
    ) -> AsyncIterator[TokenChunk]:

        if not self._api_key:
            raise ProviderError(
                "GROQ_API_KEY not configured",
                provider=self.name,
            )

        body = {
            "model": request.model,
            "messages": self._serialize_messages(request.messages),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self._base_url}/chat/completions",
                    headers=self._headers(),
                    json=body,
                ) as response:

                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        line = line.strip()

                        if not line.startswith("data:"):
                            continue

                        payload = line[5:].strip()

                        if payload == "[DONE]":
                            break

                        try:
                            chunk = json.loads(payload)

                            delta = (
                                chunk["choices"][0]
                                .get("delta", {})
                                .get("content")
                            )

                            if delta:
                                yield TokenChunk(text=delta)

                        except Exception:
                            continue

        except Exception as exc:
            raise self._build_provider_error(exc)

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------

    async def embed(
        self,
        texts: list[str],
        model: str,
    ) -> EmbeddingResponse:
        raise NotImplementedError(
            "Groq embeddings are not supported."
        )

    # ------------------------------------------------------------------
    # Tool Calling
    # ------------------------------------------------------------------

    async def tool_call(
        self,
        request: ChatRequest,
        tools: list[ToolDefinition],
    ) -> ToolCallResponse:
        raise NotImplementedError(
            "Groq tool calling not implemented."
        )

    # ------------------------------------------------------------------
    # Health Check
    # ------------------------------------------------------------------

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            status=(
                ProviderStatus.healthy
                if self._api_key
                else ProviderStatus.unavailable
            ),
        )

    # ------------------------------------------------------------------
    # Token Count
    # ------------------------------------------------------------------

    def token_count(
        self,
        messages: list[ProviderMessage],
        model: str,
    ) -> int:

        try:
            import tiktoken

            enc = tiktoken.get_encoding("cl100k_base")

            total = 0

            for msg in messages:
                total += len(
                    enc.encode(msg.content or "")
                )

            return total

        except Exception:
            text = " ".join(
                msg.content or ""
                for msg in messages
            )
            return len(text.split())


# ------------------------------------------------------------------
# Singleton
# ------------------------------------------------------------------

groq_provider = GroqProvider()