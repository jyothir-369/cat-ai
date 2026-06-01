from __future__ import annotations

import time
from typing import AsyncIterator

from core.config import settings
from core.exceptions import ProviderError

from ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    ProviderHealth,
    ProviderStatus,
    TokenChunk,
    ToolCallResponse,
)

try:
    import anthropic as _anthropic_sdk

    _client = (
        _anthropic_sdk.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY
        )
        if settings.ANTHROPIC_API_KEY
        else None
    )
except ImportError:
    _client = None


class AnthropicProvider(BaseProvider):
    name = "anthropic"

    def _get_client(self):
        if not _client:
            raise ProviderError(
                self.name,
                "anthropic package not installed or API key missing",
            )
        return _client

    def _split_messages(self, messages):
        """
        Anthropic expects the system prompt separately.
        """
        system = None
        filtered = []

        for message in messages:
            role = (
                message.role.value
                if hasattr(message.role, "value")
                else str(message.role)
            )

            if role == "system":
                system = message.content
            else:
                filtered.append(
                    {
                        "role": role,
                        "content": message.content or "",
                    }
                )

        return system, filtered

    async def chat_completion(
        self,
        request: ChatRequest,
    ) -> ChatResponse:
        client = self._get_client()

        system, messages = self._split_messages(
            request.messages
        )

        try:
            kwargs = {
                "model": request.model,
                "max_tokens": request.max_tokens,
                "messages": messages,
            }

            if system:
                kwargs["system"] = system

            response = await client.messages.create(
                **kwargs
            )

            content = ""

            for block in response.content:
                if hasattr(block, "text"):
                    content += block.text

            return ChatResponse(
                content=content,
                model=response.model,
                tokens_in=response.usage.input_tokens,
                tokens_out=response.usage.output_tokens,
                finish_reason=response.stop_reason or "stop",
            )

        except Exception as exc:
            raise ProviderError(
                self.name,
                str(exc),
            ) from exc

    async def stream_completion(
        self,
        request: ChatRequest,
    ) -> AsyncIterator[TokenChunk]:
        client = self._get_client()

        system, messages = self._split_messages(
            request.messages
        )

        try:
            kwargs = {
                "model": request.model,
                "max_tokens": request.max_tokens,
                "messages": messages,
                "stream": True,
            }

            if system:
                kwargs["system"] = system

            async with client.messages.stream(
                **kwargs
            ) as stream:
                async for text in stream.text_stream:
                    yield TokenChunk(
                        text=text,
                    )

        except Exception as exc:
            raise ProviderError(
                self.name,
                str(exc),
            ) from exc

    async def embed(
        self,
        texts: list[str],
        model: str,
    ):
        """
        Anthropic currently does not provide embeddings.
        Placeholder implementation.
        """

        return {
            "embeddings": [
                [0.0] * 1536 for _ in texts
            ],
            "model": model,
            "tokens_used": 0,
        }

    async def tool_call(
        self,
        request: ChatRequest,
        tools,
    ) -> ToolCallResponse:
        """
        Basic implementation so the provider satisfies
        BaseProvider requirements.

        You can later replace this with true Anthropic
        tool-use support.
        """

        response = await self.chat_completion(
            request
        )

        return ToolCallResponse(
            content=response.content,
            model=response.model,
            tokens_in=response.tokens_in,
            tokens_out=response.tokens_out,
            tool_calls=[],
            finish_reason=response.finish_reason or "stop",
        )

    async def health_check(
        self,
    ) -> ProviderHealth:
        start = time.monotonic()

        try:
            client = self._get_client()

            await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1,
                messages=[
                    {
                        "role": "user",
                        "content": "ping",
                    }
                ],
            )

            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.healthy,
                latency_ms=(
                    time.monotonic() - start
                )
                * 1000,
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
        """
        Rough token estimation.
        Replace later with Anthropic tokenizer.
        """

        try:
            total_chars = sum(
                len(message.content or "")
                for message in messages
            )

            return total_chars // 4

        except Exception:
            return 0


anthropic_provider = AnthropicProvider()