from __future__ import annotations

import time
from typing import AsyncIterator

from core.config import settings
from core.exceptions import ProviderError

from ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    EmbeddingResponse,
    ProviderHealth,
    ProviderStatus,
    TokenChunk,
    ToolCallResponse,
)

try:
    from openai import AsyncOpenAI

    _client = (
        AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        if settings.OPENAI_API_KEY
        else None
    )
except ImportError:
    _client = None


class OpenAIProvider(BaseProvider):
    name = "openai"

    def _get_client(self) -> "AsyncOpenAI":
        if _client is None:
            raise ProviderError(
                "OpenAI package not installed or API key missing",
                provider=self.name,
            )
        return _client

    async def chat_completion(
        self,
        request: ChatRequest,
    ) -> ChatResponse:
        client = self._get_client()

        messages = [
            {
                "role": str(message.role),
                "content": message.content,
            }
            for message in request.messages
        ]

        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=False,
            )

            choice = response.choices[0]

            return ChatResponse(
                content=choice.message.content or "",
                model=response.model,
                tokens_in=response.usage.prompt_tokens if response.usage else 0,
                tokens_out=response.usage.completion_tokens if response.usage else 0,
                finish_reason=choice.finish_reason or "stop",
            )

        except Exception as exc:
            raise ProviderError(
                str(exc),
                provider=self.name,
            ) from exc

    async def stream_completion(
        self,
        request: ChatRequest,
    ) -> AsyncIterator[TokenChunk]:
        client = self._get_client()

        messages = [
            {
                "role": str(message.role),
                "content": message.content,
            }
            for message in request.messages
        ]

        try:
            stream = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=True,
            )

            async for chunk in stream:
                choice = chunk.choices[0]
                delta = choice.delta

                if getattr(delta, "content", None):
                    yield TokenChunk(
                        text=delta.content,
                        finish_reason=choice.finish_reason,
                        model=request.model,
                    )

        except Exception as exc:
            raise ProviderError(
                str(exc),
                provider=self.name,
            ) from exc

    async def embed(
        self,
        texts: list[str],
        model: str = "text-embedding-3-small",
    ) -> EmbeddingResponse:
        client = self._get_client()

        try:
            response = await client.embeddings.create(
                model=model,
                input=texts,
            )

            embeddings = [item.embedding for item in response.data]

            return EmbeddingResponse(
                embeddings=embeddings,
                model=model,
                tokens_used=response.usage.total_tokens
                if response.usage
                else 0,
            )

        except Exception as exc:
            raise ProviderError(
                str(exc),
                provider=self.name,
            ) from exc

    async def tool_call(
        self,
        request: ChatRequest,
        tools,
    ) -> ToolCallResponse:
        """
        OpenAI function/tool calling support.
        """

        client = self._get_client()

        messages = [
            {
                "role": str(message.role),
                "content": message.content,
            }
            for message in request.messages
        ]

        try:
            response = await client.chat.completions.create(
                model=request.model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )

            choice = response.choices[0]

            return ToolCallResponse(
                content=choice.message.content or "",
                model=response.model,
                tokens_in=response.usage.prompt_tokens
                if response.usage
                else 0,
                tokens_out=response.usage.completion_tokens
                if response.usage
                else 0,
                tool_calls=[],
                finish_reason=choice.finish_reason or "tool_calls",
            )

        except Exception as exc:
            raise ProviderError(
                str(exc),
                provider=self.name,
            ) from exc

    async def health_check(self) -> ProviderHealth:
        start = time.monotonic()

        try:
            client = self._get_client()

            await client.models.list()

            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.healthy,
                latency_ms=(time.monotonic() - start) * 1000,
            )

        except Exception as exc:
            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.unavailable,
                error=str(exc),
            )

    def token_count(
        self,
        messages,
        model: str,
    ) -> int:
        try:
            import tiktoken

            encoding = tiktoken.encoding_for_model(model)

            total = 0

            for message in messages:
                content = getattr(message, "content", "") or ""
                total += len(encoding.encode(content)) + 4

            return total

        except Exception:
            return sum(
                len((getattr(message, "content", "") or "").split())
                for message in messages
            )