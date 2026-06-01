from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Optional

from apps.api.ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    ProviderError,
    TokenChunk,
)

logger = logging.getLogger(__name__)

# Model prefix → provider name mapping
MODEL_PREFIX_MAP: dict[str, str] = {
    "gpt-": "openai",
    "o1-": "openai",
    "o3-": "openai",
    "claude-": "anthropic",
    "llama": "groq",
    "mixtral": "groq",
    "gemma": "groq",
    "gemini": "gemini",
}

# Fallback order when primary provider fails
FALLBACK_ORDER = ["openai", "anthropic", "groq"]


class ProviderRouter:
    """
    Routes completion requests to the appropriate provider based on
    model prefix or explicit config. Supports fallback chains and
    circuit-breaker-aware routing.
    """

    def __init__(
        self,
        providers: dict[str, BaseProvider],
        circuit_breaker: Optional[Any] = None,
    ):
        self.providers = providers  # name → BaseProvider instance
        self.circuit_breaker = circuit_breaker

    # ── Provider Selection ───────────────────────────────────────────

    def resolve_provider(self, model: str) -> tuple[str, BaseProvider]:
        """
        Determine which provider to use for a given model string.
        Returns (provider_name, provider_instance).
        """
        model_lower = model.lower()
        for prefix, provider_name in MODEL_PREFIX_MAP.items():
            if model_lower.startswith(prefix):
                if provider_name in self.providers:
                    return provider_name, self.providers[provider_name]

        # Default to openai if no prefix matches
        if "openai" in self.providers:
            return "openai", self.providers["openai"]

        # Return first available provider
        name, provider = next(iter(self.providers.items()))
        return name, provider

    def _is_circuit_open(self, provider_name: str) -> bool:
        if self.circuit_breaker is None:
            return False
        return self.circuit_breaker.is_open(provider_name)

    def _record_success(self, provider_name: str) -> None:
        if self.circuit_breaker:
            self.circuit_breaker.record_success(provider_name)

    def _record_failure(self, provider_name: str) -> None:
        if self.circuit_breaker:
            self.circuit_breaker.record_failure(provider_name)

    # ── Completion ───────────────────────────────────────────────────

    async def complete_with_fallback(
        self, request: ChatRequest
    ) -> ChatResponse:
        """
        Attempt completion with the primary provider, falling back
        through FALLBACK_ORDER if the circuit is open or an error occurs.
        """
        primary_name, primary_provider = self.resolve_provider(request.model)

        candidates: list[tuple[str, BaseProvider]] = []
        if not self._is_circuit_open(primary_name):
            candidates.append((primary_name, primary_provider))

        # Build fallback list (excluding primary)
        for name in FALLBACK_ORDER:
            if name != primary_name and name in self.providers:
                if not self._is_circuit_open(name):
                    candidates.append((name, self.providers[name]))

        last_error: Optional[Exception] = None
        for provider_name, provider in candidates:
            try:
                response = await provider.chat_completion(request)
                self._record_success(provider_name)
                return response
            except ProviderError as exc:
                logger.warning(
                    "Provider %s failed: %s", provider_name, exc
                )
                self._record_failure(provider_name)
                last_error = exc
                if not exc.retryable:
                    # Non-retryable error — try next provider
                    continue
            except Exception as exc:
                logger.exception(
                    "Unexpected error from provider %s", provider_name
                )
                self._record_failure(provider_name)
                last_error = exc

        raise ProviderError(
            message=f"All providers failed. Last error: {last_error}",
            provider="router",
            retryable=False,
        )

    async def stream_with_fallback(
        self, request: ChatRequest
    ) -> AsyncIterator[TokenChunk]:
        """
        Attempt streaming with the primary provider, falling back on error.
        On fallback, switches to non-streaming and yields the full response.
        """
        primary_name, primary_provider = self.resolve_provider(request.model)

        if not self._is_circuit_open(primary_name):
            try:
                async for chunk in primary_provider.stream_completion(request):
                    yield chunk
                self._record_success(primary_name)
                return
            except ProviderError as exc:
                logger.warning(
                    "Streaming provider %s failed: %s", primary_name, exc
                )
                self._record_failure(primary_name)
            except Exception as exc:
                logger.exception(
                    "Unexpected streaming error from %s", primary_name
                )
                self._record_failure(primary_name)

        # Fallback: use non-streaming on next available provider
        for name in FALLBACK_ORDER:
            if name == primary_name:
                continue
            if name not in self.providers:
                continue
            if self._is_circuit_open(name):
                continue

            provider = self.providers[name]
            try:
                response = await provider.chat_completion(request)
                self._record_success(name)
                # Emit single chunk to satisfy stream interface
                yield TokenChunk(
                    text=response.content,
                    finish_reason="stop",
                    model=response.model,
                )
                return
            except Exception as exc:
                logger.exception("Fallback provider %s failed", name)
                self._record_failure(name)

        raise ProviderError(
            message="All providers failed during streaming",
            provider="router",
            retryable=False,
        )

    # ── Sync Completion ──────────────────────────────────────────────

    async def complete(
        self, model: str, messages: list, **kwargs: Any
    ) -> ChatResponse:
        """Convenience wrapper that builds a ChatRequest and routes it."""
        from apps.api.ai.providers.base import ChatRequest as CR

        request = CR(messages=messages, model=model, **kwargs)
        return await self.complete_with_fallback(request)